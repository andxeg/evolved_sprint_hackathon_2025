#!/usr/bin/env python3
"""
boltzgen_hotspots.py
--------------------
Compute interface hotspots for BoltzGen complexes and export a CSV that uses
**mmCIF label numbering** (label_asym_id / label_seq_id), ready to paste into
BoltzGen YAML `binding_types`.

It will:
- Read *.cif (and/or PDBs) from a directory
- Convert CIF -> PDB (via gemmi) for MDAnalysis processing
- Build an auth->label mapping from the mmCIF (auth_asym_id,auth_seq_id[,icode])
- Accumulate contact counts, ΔSASA, and salt-bridge presence per receptor residue
- Output a CSV with columns: label_chain, label_resid, label_resname, ...

Usage (example):
    python boltzgen_hotspots.py \
        --cif-dir final_5_designs \
        --glob "*.cif" \
        --out FGCR4_interactions.csv \
        --contact 1.5 \
        --dsasa 1.0 \
        --receptor-chains A \
        --binder-chains B

If you don't pass receptor/binder chains, the script will auto-detect the
largest protein chain as the receptor and treat the rest as binder.
"""

# --- Defaults (can still be overridden by CLI) ---
DEFAULT_GLOB = "*.cif"
DEFAULT_CONTACT = 1.5
DEFAULT_DSASA = 1.0

# --- deps and setup ---
import importlib, sys, subprocess
def _ensure(pkg, pip_name=None):
    try:
        importlib.import_module(pkg)
    except Exception:
        subprocess.check_call([sys.executable, "-m", "pip", "install", pip_name or pkg])

for _pkg, _pip in [
    ("numpy", None),
    ("pandas", None),
    ("MDAnalysis", "MDAnalysis"),
    ("gemmi", "gemmi"),
]:
    _ensure(_pkg, _pip)

BACKEND = "mdanalysis"
try:
    import MDAnalysis as mda
    from MDAnalysis.analysis.sasa import ShrakeRupley  # may be missing in lean builds
except Exception:
    BACKEND = "freesasa"
    _ensure("freesasa", "freesasa")
    import MDAnalysis as mda

import os, glob, tempfile, contextlib, warnings, argparse
from collections import defaultdict
import numpy as np
import pandas as pd
from MDAnalysis.lib.distances import distance_array
import gemmi
if BACKEND == "freesasa":
    import freesasa

warnings.filterwarnings("ignore", category=UserWarning, module="MDAnalysis")


# ---------- mmCIF auth→label mapping ----------
def build_auth_to_label_map(cif_path):
    """
    Returns dict: (auth_asym_id, auth_seq_id:int, icode:str) ->
                  (label_asym_id, label_seq_id:int, label_comp_id)
    """
    mapping = {}
    try:
        doc = gemmi.cif.read_file(cif_path)
        block = doc.sole_block()
        cols = [
            "label_asym_id", "label_seq_id", "label_comp_id",
            "auth_asym_id",  "auth_seq_id",  "auth_comp_id",
            "pdbx_PDB_ins_code"
        ]
        tbl = block.find("_atom_site.", cols)
        for row in tbl:
            l_asym = row[0]
            l_seq  = row[1]
            l_comp = row[2]
            a_asym = row[3]
            a_seq  = row[4]
            icode  = row[6] if len(row) > 6 else "?"

            if a_asym in (".", "?") or a_seq in (".", "?") or l_seq in (".", "?"):
                continue
            try:
                a_seq_i = int(a_seq)
                l_seq_i = int(l_seq)
            except Exception:
                continue

            icode = "" if icode in (".", "?") else icode.strip()
            key = (a_asym, a_seq_i, icode)
            val = (l_asym, l_seq_i, l_comp)

            if key not in mapping:
                mapping[key] = val
    except Exception as e:
        print(f"[warn] auth→label map failed for {os.path.basename(cif_path)}: {e}")
    return mapping


# ---------- file collection (keep pdb path + mapping) ----------
def cif_to_pdb_gemmi(cif_path, out_dir=None):
    st = gemmi.read_structure(cif_path)
    # keep first model if multi-model
    if len(st) > 1:
        new = gemmi.Structure()
        new.cell = st.cell
        new.spacegroup_hm = st.spacegroup_hm
        new.add_model(st[0], "1")
        st = new
    st.remove_empty_chains()
    base = os.path.basename(cif_path)
    root, _ = os.path.splitext(base)
    out_dir = out_dir or os.path.dirname(cif_path)
    pdb_path = os.path.join(out_dir, f"{root}.pdb")
    st.write_minimal_pdb(pdb_path)
    return pdb_path


def collect_structures_with_maps(input_dir, glob_pattern):
    """
    Returns list of dicts: {"pdb": <pdb_path>, "map": <auth→label dict>, "source": <original path>}
    """
    candidates = sorted(glob.glob(os.path.join(input_dir, glob_pattern)))
    if not candidates:
        raise RuntimeError(f"No files matched {os.path.join(input_dir, glob_pattern)}")
    by_pdb = {}
    for path in candidates:
        ext = os.path.splitext(path)[1].lower()
        if ext in (".cif", ".mmcif"):
            try:
                pdb_path = cif_to_pdb_gemmi(path, out_dir=input_dir)
                by_pdb[pdb_path] = {"pdb": pdb_path, "map": build_auth_to_label_map(path), "source": path}
            except Exception as e:
                print(f"[skip] CIF->PDB failed for {os.path.basename(path)}: {e}")
        elif ext == ".pdb":
            by_pdb[path] = {"pdb": path, "map": None, "source": path}
    # also include any stray PDBs in the dir
    for p in sorted(glob.glob(os.path.join(input_dir, "*.pdb"))):
        by_pdb.setdefault(p, {"pdb": p, "map": None, "source": p})
    out = list(sorted(by_pdb.values(), key=lambda d: d["pdb"]))
    if not out:
        raise RuntimeError("No usable PDB files (after CIF conversion).")
    return out


# ---------- helpers on Universe / residues ----------
def heavy_atoms(ag):
    try:
        return ag.select_atoms("not name H*")
    except Exception:
        return ag.atoms[[not n.upper().startswith("H") for n in ag.atoms.names]]


def _chain_atoms_by_id(u, cid):
    """Robustly get atoms for a chain ID, trying chainIDs then segids then selections."""
    # Try direct attribute arrays first (fast)
    try:
        mask = [str(x).strip() == cid for x in u.atoms.chainIDs]
        if any(mask):
            return u.atoms[mask]
    except Exception:
        pass
    try:
        mask = [str(x).strip() == cid for x in u.atoms.segids]
        if any(mask):
            return u.atoms[mask]
    except Exception:
        pass
    # Fall back to selections
    for selkey in ("chainid", "segid", "chainID"):
        try:
            ag = u.select_atoms(f"{selkey} {cid}")
            if ag.n_atoms:
                return ag
        except Exception:
            continue
    return mda.AtomGroup([], u)


def get_chain_id_from_residue(res):
    # Prefer chainID; fall back to segid if needed.
    try:
        cid = getattr(res, "chainID", None)
        if cid is not None and len(str(cid).strip()) > 0:
            return str(cid).strip()
    except Exception:
        pass
    try:
        arr = res.atoms.chainIDs
        if len(arr) > 0:
            return str(arr[0]).strip()
    except Exception:
        pass
    try:
        return str(res.segid).strip()
    except Exception:
        return ""


def residue_key_auth(res):
    return (get_chain_id_from_residue(res), int(res.resid), res.resname.strip())


def residue_key_label_from_auth(auth_key, mapping):
    """
    auth_key=(auth_chain, auth_resid, icode_opt) or (auth_chain, auth_resid, resname)
    -> returns label key. If mapping is None or missing, falls back to the given ids.
    """
    if mapping is None:
        chain, resid, resn = auth_key
        return (chain or "?", int(resid), resn), False
    if len(auth_key) == 3:
        chain, resid, icode_or_resn = auth_key
        # MDAnalysis doesn't expose insertion code reliably; assume empty
        icode = ""
    else:
        chain, resid = auth_key[:2]
        icode = ""
    key = (chain, int(resid), icode)
    lab = mapping.get(key) or mapping.get((chain, int(resid), ""))
    if lab is None:
        # fallback: keep as-is
        chain_a, resid_a, resn_a = auth_key[0], auth_key[1], (auth_key[2] if len(auth_key) > 2 else "?")
        return (chain_a or "?", int(resid_a), resn_a), False
    l_asym, l_seq, l_comp = lab
    return (l_asym, int(l_seq), l_comp), True


def pick_largest_protein_chain(u):
    # use chainIDs, not segids
    try:
        chain_ids = [str(c).strip() for c in np.unique(u.atoms.chainIDs)]
    except Exception:
        chain_ids = []
    best_c, best_n = None, -1
    for cid in chain_ids:
        if cid == "":
            continue
        ag = _chain_atoms_by_id(u, cid)
        n = ag.select_atoms("protein").n_atoms
        if n > best_n:
            best_n, best_c = n, cid
    return str(best_c) if best_c is not None else None


def get_receptor_and_binder(u, receptor_chains=None, binder_chains=None, ligand_resname=None):
    if receptor_chains:
        rec_ag = mda.AtomGroup([], u)
        for cid in receptor_chains:
            rec_ag = rec_ag | _chain_atoms_by_id(u, cid)
        receptor = rec_ag
        if receptor.n_atoms == 0:
            raise ValueError(f"Receptor chains not found: {receptor_chains}")
    else:
        best_c = pick_largest_protein_chain(u)
        if best_c is None:
            raise ValueError("Could not auto-detect a protein receptor chain.")
        receptor = _chain_atoms_by_id(u, best_c)

    if ligand_resname:
        binder = u.select_atoms(f"resname {ligand_resname} and not (resname HOH or name OW or name HW*)")
        if binder.n_atoms == 0:
            raise ValueError(f"No atoms found for ligand resname '{ligand_resname}'.")
    elif binder_chains:
        bin_ag = mda.AtomGroup([], u)
        for cid in binder_chains:
            bin_ag = bin_ag | _chain_atoms_by_id(u, cid)
        binder = bin_ag
    else:
        # everything not in receptor
        try:
            all_ids = set(map(str, np.unique(u.atoms.chainIDs)))
        except Exception:
            all_ids = set(map(str, np.unique(u.atoms.segids)))
        rec_ids = set(map(str, np.unique(receptor.atoms.chainIDs))) if hasattr(receptor.atoms, "chainIDs") else set(map(str, np.unique(receptor.atoms.segids)))
        other = mda.AtomGroup([], u)
        for cid in sorted(all_ids - rec_ids):
            other = other | _chain_atoms_by_id(u, cid)
        binder = other if other.n_atoms else u.select_atoms("not protein")

    binder = binder - receptor
    if heavy_atoms(receptor).n_atoms == 0:
        raise ValueError("Receptor has zero heavy atoms.")
    if heavy_atoms(binder).n_atoms == 0:
        print("[warn] Binder has zero heavy atoms in this structure.")
    return receptor, binder


# ---------- geometry + metrics (label-keyed) ----------
def contact_pairs_label(receptor_heavy, binder_heavy, mapping, cutoff=4.5):
    if receptor_heavy.n_atoms == 0 or binder_heavy.n_atoms == 0:
        return set()
    D = distance_array(receptor_heavy.positions, binder_heavy.positions)
    idx_i, idx_j = np.where(D <= cutoff)
    pairs = set()
    for i, j in zip(idx_i, idx_j):
        rres = receptor_heavy[i].residue
        auth_key = residue_key_auth(rres)
        lab_key, _ok = residue_key_label_from_auth(auth_key, mapping)
        pairs.add(lab_key)
    return pairs


def per_residue_contact_counts_label(receptor_heavy, binder_heavy, mapping, cutoff=4.5):
    pairs = contact_pairs_label(receptor_heavy, binder_heavy, mapping, cutoff=cutoff)
    counts = defaultdict(int)
    for rk in pairs:
        counts[rk] += 1
    return counts


def _sasa_per_residue_mdanalysis(atomgroup_or_universe, n_sphere_points=960, probe=1.4):
    sr = ShrakeRupley(n_sphere_points=n_sphere_points, probe_radius=probe)
    ag = atomgroup_or_universe.atoms if hasattr(atomgroup_or_universe, "atoms") else atomgroup_or_universe
    sr.run(ag)
    per_res = {}
    for res in ag.residues:
        per_res[residue_key_auth(res)] = float(np.sum(res.atoms.tempfactors))
    return per_res


def _sasa_per_residue_freesasa(universe_or_ag):
    ag = universe_or_ag.atoms if hasattr(universe_or_ag, "atoms") else universe_or_ag
    U = mda.Merge(ag)
    with tempfile.NamedTemporaryFile(suffix=".pdb", delete=False) as tf:
        tmp = tf.name
    with mda.coordinates.PDB.PDBWriter(tmp, multiframe=False) as w:
        w.write(U.atoms)
    try:
        structure = freesasa.Structure(tmp)
        result = freesasa.calc(structure)
        n_atoms = structure.nAtoms()
        per_res = defaultdict(float)
        for idx, atom in enumerate(U.atoms):
            area = float(result.atomArea(idx)) if idx < n_atoms else 0.0
            per_res[residue_key_auth(atom.residue)] += area
    finally:
        with contextlib.suppress(Exception):
            os.remove(tmp)
    return dict(per_res)


def _sasa_per_residue(universe_or_ag):
    return _sasa_per_residue_mdanalysis(universe_or_ag) if BACKEND == "mdanalysis" else _sasa_per_residue_freesasa(universe_or_ag)


def run_sasa_delta_label(receptor_atoms, binder_atoms, mapping):
    U_rec  = mda.Merge(receptor_atoms)
    U_comb = mda.Merge(receptor_atoms, binder_atoms)
    # compute on auth keys then remap to label keys
    sasa_rec_only = _sasa_per_residue(U_rec)
    sasa_comb_all = _sasa_per_residue(U_comb)
    # only receptor residues
    rec_auth_keys = set(sasa_rec_only.keys())
    sasa_rec_with = {k: v for k, v in sasa_comb_all.items() if k in rec_auth_keys}
    out = {}
    for ak in rec_auth_keys:
        lab_key, _ok = residue_key_label_from_auth(ak, mapping)
        out[lab_key] = max(0.0, sasa_rec_only.get(ak, 0.0) - sasa_rec_with.get(ak, 0.0))
    return out


def find_salt_bridges_label(receptor, binder, mapping, cutoff=4.0):
    rec_prot = receptor.select_atoms("protein")
    bin_prot = binder.select_atoms("protein")
    if rec_prot.n_atoms == 0 or bin_prot.n_atoms == 0:
        return set()
    acidic_r = rec_prot.select_atoms("(resname ASP and (name OD1 or name OD2)) or (resname GLU and (name OE1 or name OE2))")
    basic_b  = bin_prot.select_atoms("(resname ARG and (name NH1 or name NH2 or name NE)) or (resname LYS and name NZ)")
    acidic_b = bin_prot.select_atoms("(resname ASP and (name OD1 or name OD2)) or (resname GLU and (name OE1 or name OE2))")
    basic_r  = rec_prot.select_atoms("(resname ARG and (name NH1 or name NH2 or name NE)) or (resname LYS and name NZ)")
    bridges = set()
    def pair_up(A, B):
        if A.n_atoms == 0 or B.n_atoms == 0:
            return
        D = distance_array(A.positions, B.positions)
        idx_i, idx_j = np.where(D <= cutoff)
        for i, j in zip(idx_i, idx_j):
            rres = A[i].residue
            lab_key, _ok = residue_key_label_from_auth(residue_key_auth(rres), mapping)
            bridges.add(lab_key)
    pair_up(acidic_r, basic_b)
    pair_up(basic_r,  acidic_b)
    return bridges


# ---------- main analysis ----------
def analyze_cxcr4_from_pdbs(
    entries,                       # list of dicts from collect_structures_with_maps
    receptor_chains=None,          # list of auth chainIDs for receptor
    binder_chains=None,            # list of auth chainIDs for binder (protein binder)
    ligand_resname=None,           # small-molecule binder resname (optional)
    contact_cutoff=4.5,
    delta_sasa_thresh=1.0,
    out_csv="cxcr4_interactions.csv"
):
    designs = 0
    contact_counts_total = defaultdict(int)
    delta_sasa_total = defaultdict(float)
    salt_bridge_presence = defaultdict(int)
    any_label_fail = False

    for ent in entries:
        path = ent["pdb"]; mapping = ent["map"]
        try:
            u = mda.Universe(path)
        except Exception as e:
            print(f"[skip] Failed to load {os.path.basename(path)}: {e}")
            continue
        try:
            receptor, binder = get_receptor_and_binder(
                u,
                receptor_chains=receptor_chains if receptor_chains else None,
                binder_chains=binder_chains if binder_chains else None,
                ligand_resname=ligand_resname if ligand_resname else None
            )
        except Exception as e:
            print(f"[skip] {os.path.basename(path)}: {e}")
            continue

        designs += 1
        r_heavy = heavy_atoms(receptor)
        b_heavy = heavy_atoms(binder)

        # contacts
        cc = per_residue_contact_counts_label(r_heavy, b_heavy, mapping, cutoff=contact_cutoff)
        for k, v in cc.items():
            contact_counts_total[k] += v

        # ΔSASA
        ds = run_sasa_delta_label(receptor_atoms=receptor, binder_atoms=binder, mapping=mapping)
        for k, v in ds.items():
            delta_sasa_total[k] += v

        # salt bridges
        sb = find_salt_bridges_label(receptor, binder, mapping, cutoff=4.0)
        for k in sb:
            salt_bridge_presence[k] += 1

        # sanity: detect missing label mapping
        if mapping is None:
            any_label_fail = True

    if designs == 0:
        raise RuntimeError("No analyzable designs found.")

    # format rows
    keys = set(contact_counts_total.keys()) | set(delta_sasa_total.keys()) | set(salt_bridge_presence.keys())
    rows = []
    for (lab_chain, lab_resid, lab_resn) in keys:
        rows.append({
            "label_chain": lab_chain,
            "label_resid": int(lab_resid),
            "label_resname": lab_resn,
            "contact_count": contact_counts_total.get((lab_chain, lab_resid, lab_resn), 0),
            "delta_sasa_sum": delta_sasa_total.get((lab_chain, lab_resid, lab_resn), 0.0),
            "salt_bridge_designs": salt_bridge_presence.get((lab_chain, lab_resid, lab_resn), 0),
        })
    df = pd.DataFrame(rows)
    if df.empty:
        raise RuntimeError("No residues collected.")

    # scoring and flags
    df["contact_norm"] = df["contact_count"] / (df["contact_count"].max() or 1.0)
    df["dsasa_norm"]   = df["delta_sasa_sum"] / (df["delta_sasa_sum"].max() or 1.0)
    df["salt_bonus"]   = df["salt_bridge_designs"] / float(designs)
    df["hotspot_score"] = 0.5 * df["contact_norm"] + 0.4 * df["dsasa_norm"] + 0.1 * df["salt_bonus"]
    df["epitope_like"] = (df["delta_sasa_sum"] / designs) >= float(delta_sasa_thresh)

    # nice ordering
    df = df.sort_values(["hotspot_score", "contact_count", "delta_sasa_sum"], ascending=[False, False, False])

    # write csv with BoltzGen-ready indices
    df.to_csv(out_csv, index=False)

    top = df.head(15)[["label_chain", "label_resid", "label_resname",
                       "contact_count", "delta_sasa_sum",
                       "salt_bridge_designs", "hotspot_score", "epitope_like"]]
    print(f"\nSASA backend: {BACKEND}")
    print(f"Analyzed designs: {designs} | Residues reported: {len(df)} | Label numbering: {'OK' if not any_label_fail else 'MIXED (some files had no map)'}")
    print("\nTop interface hotspots (BoltzGen label indices):")
    with pd.option_context('display.max_rows', None, 'display.max_columns', None, 'display.width', 140):
        print(top.to_string(index=False))
    print(f"\nSaved per-residue table to: {out_csv}")
    return df, designs


# ---------- CLI ----------
def main():
    ap = argparse.ArgumentParser(description="Compute BoltzGen-ready interface hotspots (label numbering) from a directory of CIF/PDB files.")
    ap.add_argument("--cif-dir", required=True, help="Directory containing mmCIF/PDB files (BoltzGen outputs).")
    ap.add_argument("--glob", default=DEFAULT_GLOB, help=f"Glob pattern to match files (default: {DEFAULT_GLOB})")
    ap.add_argument("--out", default="FGCR4_interactions.csv", help="Output CSV path (default: FGCR4_interactions.csv)")
    ap.add_argument("--receptor-chains", default="", help='Comma-separated receptor chain IDs (auth). Empty => auto-detect largest protein chain.')
    ap.add_argument("--binder-chains", default="", help='Comma-separated binder chain IDs (auth). Empty => everything not in receptor.')
    ap.add_argument("--ligand-resname", default="", help='If binder is a small molecule, provide its residue name (e.g., LIG).')
    ap.add_argument("--contact", type=float, default=DEFAULT_CONTACT, help=f"Contact cutoff in Å (default: {DEFAULT_CONTACT})")
    ap.add_argument("--dsasa", type=float, default=DEFAULT_DSASA, help=f"ΔSASA/design threshold to flag epitope_like (default: {DEFAULT_DSASA})")

    args = ap.parse_args()

    receptor_chains = [s.strip() for s in args.receptor_chains.split(",") if s.strip()]
    binder_chains   = [s.strip() for s in args.binder_chains.split(",") if s.strip()]
    ligand_resname  = args.ligand_resname.strip() or None

    entries = collect_structures_with_maps(args.cif_dir, args.glob)
    analyze_cxcr4_from_pdbs(
        entries=entries,
        receptor_chains=receptor_chains if receptor_chains else None,
        binder_chains=binder_chains if binder_chains else None,
        ligand_resname=ligand_resname,
        contact_cutoff=args.contact,
        delta_sasa_thresh=args.dsasa,
        out_csv=args.out
    )


if __name__ == "__main__":
    main()
