
INPUT_DIR = "final_5_designs"     #
GLOB_PATTERN = "*.cif"             # "*.cif" or "*.pdb"
RECEPTOR_SEGIDS = ""               
BINDER_SEGIDS   = ""               
LIGAND_RESNAME  = ""               
CONTACT_CUTOFF_ANG = 3.5           
DELTA_SASA_THRESH = 1.0            
OUT_CSV = "cxcr4_interactions.csv" 


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


import os, glob, tempfile, contextlib, warnings
from collections import defaultdict
import numpy as np
import pandas as pd
from MDAnalysis.lib.distances import distance_array
import gemmi
if BACKEND == "freesasa":
    import freesasa

warnings.filterwarnings("ignore", category=UserWarning, module="MDAnalysis")


def union_atomgroups(ag_list):
    if not ag_list:
        return None
    ag = ag_list[0]
    for nxt in ag_list[1:]:
        ag = ag | nxt
    return ag

def cif_to_pdb_gemmi(cif_path, out_dir=None):
    st = gemmi.read_structure(cif_path)
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

def collect_structures(input_dir, glob_pattern):
    candidates = sorted(glob.glob(os.path.join(input_dir, glob_pattern)))
    if not candidates:
        raise RuntimeError(f"No files matched {os.path.join(input_dir, glob_pattern)}")
    pdb_files = []
    for path in candidates:
        ext = os.path.splitext(path)[1].lower()
        if ext in (".cif", ".mmcif"):
            try:
                pdb_files.append(cif_to_pdb_gemmi(path, out_dir=input_dir))
            except Exception as e:
                print(f"[skip] CIF->PDB failed for {os.path.basename(path)}: {e}")
        elif ext == ".pdb":
            pdb_files.append(path)
    for p in sorted(glob.glob(os.path.join(input_dir, "*.pdb"))):
        if p not in pdb_files:
            pdb_files.append(p)
    pdb_files = sorted(set(pdb_files))
    if not pdb_files:
        raise RuntimeError("No usable PDB files (after CIF conversion).")
    return pdb_files

def heavy_atoms(ag):
    try:
        return ag.select_atoms("not name H*")
    except Exception:
        return ag.atoms[[not n.upper().startswith("H") for n in ag.atoms.names]]

def pick_largest_protein_segment(u):
    best_seg, best_count = None, -1
    for seg in u.segments:
        count = seg.atoms.select_atoms("protein").n_atoms
        if count > best_count:
            best_count, best_seg = count, seg
    return best_seg

def collect_segments_by_name(u):
    return {seg.segid: seg for seg in u.segments}

def residue_key(res):
    segid = (res.segid or "").strip() or "SEG"
    return (segid, int(res.resid), res.resname.strip())

def get_receptor_and_binder(u, receptor_segids=None, binder_segids=None, ligand_resname=None):
    seg_by_id = collect_segments_by_name(u)
    if receptor_segids:
        rec_segments = [seg_by_id[s] for s in receptor_segids if s in seg_by_id]
        if not rec_segments:
            raise ValueError(f"Receptor segids not found: {receptor_segids}")
        receptor = union_atomgroups([seg.atoms for seg in rec_segments])
    else:
        rec_seg = pick_largest_protein_segment(u)
        if rec_seg is None or rec_seg.atoms.select_atoms("protein").n_atoms == 0:
            raise ValueError("Could not auto-detect a protein receptor segment.")
        receptor = rec_seg.atoms

    if ligand_resname:
        binder = u.select_atoms(f"resname {ligand_resname} and not (resname HOH or name OW or name HW*)")
        if binder.n_atoms == 0:
            raise ValueError(f"No atoms found for ligand resname '{ligand_resname}'.")
    elif binder_segids:
        bin_segments = [seg_by_id[s] for s in binder_segids if s in seg_by_id]
        if not bin_segments:
            raise ValueError(f"Binder segids not found: {binder_segids}")
        binder = union_atomgroups([seg.atoms for seg in bin_segments])
    else:
        rec_ids = set(receptor.segments.segids)
        other_ag = [seg.atoms for seg in u.segments if seg.segid not in rec_ids]
        binder = union_atomgroups(other_ag) if other_ag else u.select_atoms("not protein")

    binder = binder - receptor
    if heavy_atoms(receptor).n_atoms == 0:
        raise ValueError("Receptor has zero heavy atoms.")
    if heavy_atoms(binder).n_atoms == 0:
        print("[warn] Binder has zero heavy atoms in this structure.")
    return receptor, binder

def contact_pairs(receptor_heavy, binder_heavy, cutoff=4.5):
    if receptor_heavy.n_atoms == 0 or binder_heavy.n_atoms == 0:
        return set()
    D = distance_array(receptor_heavy.positions, binder_heavy.positions)
    idx_i, idx_j = np.where(D <= cutoff)
    pairs = set()
    for i, j in zip(idx_i, idx_j):
        rres = receptor_heavy[i].residue
        bres = binder_heavy[j].residue
        pairs.add((residue_key(rres), residue_key(bres)))
    return pairs

def per_residue_contact_counts(receptor_heavy, binder_heavy, cutoff=4.5):
    pairs = contact_pairs(receptor_heavy, binder_heavy, cutoff=cutoff)
    counts = defaultdict(int)
    for (rk, _bk) in pairs:
        counts[rk] += 1
    return counts

def _sasa_per_residue_mdanalysis(atomgroup_or_universe, n_sphere_points=960, probe=1.4):
    from MDAnalysis.analysis.sasa import ShrakeRupley
    sr = ShrakeRupley(n_sphere_points=n_sphere_points, probe_radius=probe)
    ag = atomgroup_or_universe.atoms if hasattr(atomgroup_or_universe, "atoms") else atomgroup_or_universe
    sr.run(ag)
    per_res = {}
    for res in ag.residues:
        per_res[residue_key(res)] = float(np.sum(res.atoms.tempfactors))
    return per_res

def _sasa_per_residue_freesasa(universe_or_ag):
    """
    FreeSASA path using per-atom accessor: result.atomArea(i)
    """
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
        # enumerate in exact write order; map via index
        for idx, atom in enumerate(U.atoms):
            if idx < n_atoms:
                area = float(result.atomArea(idx))  # <-- per-atom accessor (works across versions)
            else:
                area = 0.0
            per_res[residue_key(atom.residue)] += area
    finally:
        with contextlib.suppress(Exception):
            os.remove(tmp)
    return dict(per_res)

def _sasa_per_residue(universe_or_ag):
    if BACKEND == "mdanalysis":
        return _sasa_per_residue_mdanalysis(universe_or_ag)
    else:
        return _sasa_per_residue_freesasa(universe_or_ag)

def run_sasa_delta(receptor_atoms, binder_atoms):
    U_rec  = mda.Merge(receptor_atoms)
    U_comb = mda.Merge(receptor_atoms, binder_atoms)
    rec_keys = {residue_key(res) for res in U_rec.residues}
    sasa_rec_only = _sasa_per_residue(U_rec)
    sasa_comb_all = _sasa_per_residue(U_comb)
    sasa_rec_with = {k: v for k, v in sasa_comb_all.items() if k in rec_keys}
    return {k: max(0.0, sasa_rec_only.get(k, 0.0) - sasa_rec_with.get(k, 0.0)) for k in rec_keys}

def find_salt_bridges(receptor, binder, cutoff=4.0):
    rec_prot = receptor.select_atoms("protein")
    bin_prot = binder.select_atoms("protein")
    if rec_prot.n_atoms == 0 or bin_prot.n_atoms == 0:
        return set()
    acidic_r = rec_prot.select_atoms("(resname ASP and (name OD1 or name OD2)) or (resname GLU and (name OE1 or name OE2))")
    basic_b  = bin_prot.select_atoms("(resname ARG and (name NH1 or name NH2 or name NE)) or (resname LYS and name NZ)")
    acidic_b = bin_prot.select_atoms("(resname ASP and (name OD1 or name OD2)) or (resname GLU and (name OE1 or name OE2))")
    basic_r  = rec_prot.select_atoms("(resname ARG and (name NH1 or name NH2 or name NE)) or (resname LYS and name NZ)")
    bridges = set()
    def pair_up(A, B, receptor_is_A=True):
        if A.n_atoms == 0 or B.n_atoms == 0:
            return
        D = distance_array(A.positions, B.positions)
        idx_i, idx_j = np.where(D <= cutoff)
        for i, j in zip(idx_i, idx_j):
            rA = A[i].residue
            rB = B[j].residue
            bridges.add(residue_key(rA if receptor_is_A else rB))
    pair_up(acidic_r, basic_b, True)
    pair_up(basic_r,  acidic_b, True)
    return bridges

def analyze_cxcr4_from_pdbs(
    pdb_files,
    receptor_segids=None,
    binder_segids=None,
    ligand_resname=None,
    contact_cutoff=4.5,
    delta_sasa_thresh=1.0,
    out_csv="cxcr4_interactions.csv"
):
    designs = 0
    contact_counts_total = defaultdict(int)
    delta_sasa_total = defaultdict(float)
    salt_bridge_presence = defaultdict(int)

    for path in pdb_files:
        try:
            u = mda.Universe(path)
        except Exception as e:
            print(f"[skip] Failed to load {os.path.basename(path)}: {e}")
            continue
        try:
            receptor, binder = get_receptor_and_binder(
                u,
                receptor_segids=receptor_segids if receptor_segids else None,
                binder_segids=binder_segids if binder_segids else None,
                ligand_resname=ligand_resname if ligand_resname else None
            )
        except Exception as e:
            print(f"[skip] {os.path.basename(path)}: {e}")
            continue

        designs += 1
        r_heavy = heavy_atoms(receptor)
        b_heavy = heavy_atoms(binder)

        cc = per_residue_contact_counts(r_heavy, b_heavy, cutoff=contact_cutoff)
        for k, v in cc.items():
            contact_counts_total[k] += v

        ds = run_sasa_delta(receptor_atoms=receptor, binder_atoms=binder)
        for k, v in ds.items():
            delta_sasa_total[k] += v

        sb = find_salt_bridges(receptor, binder, cutoff=4.0)
        for k in sb:
            salt_bridge_presence[k] += 1

    if designs == 0:
        raise RuntimeError("No analyzable designs found.")

    keys = set(contact_counts_total.keys()) | set(delta_sasa_total.keys()) | set(salt_bridge_presence.keys())
    rows = []
    for k in keys:
        segid, resid, resn = k
        rows.append({
            "segid": segid,
            "resid": resid,
            "resname": resn,
            "contact_count": contact_counts_total.get(k, 0),
            "delta_sasa_sum": delta_sasa_total.get(k, 0.0),
            "salt_bridge_designs": salt_bridge_presence.get(k, 0),
        })
    df = pd.DataFrame(rows)
    if df.empty:
        raise RuntimeError("No residues collected.")

    df["contact_norm"] = df["contact_count"] / (df["contact_count"].max() or 1.0)
    df["dsasa_norm"]   = df["delta_sasa_sum"] / (df["delta_sasa_sum"].max() or 1.0)
    df["salt_bonus"]   = df["salt_bridge_designs"] / float(designs)
    df["hotspot_score"] = 0.5 * df["contact_norm"] + 0.4 * df["dsasa_norm"] + 0.1 * df["salt_bonus"]
    df["epitope_like"] = (df["delta_sasa_sum"] / designs) >= float(delta_sasa_thresh)
    df = df.sort_values(["hotspot_score", "contact_count", "delta_sasa_sum"], ascending=[False, False, False])
    df.to_csv(out_csv, index=False)

    top = df.head(15)[["segid", "resid", "resname", "contact_count", "delta_sasa_sum",
                       "salt_bridge_designs", "hotspot_score", "epitope_like"]]
    print(f"\nSASA backend: {BACKEND}")
    print(f"Analyzed designs: {designs} | Residues reported: {len(df)}")
    print("\nTop interface hotspots:")
    with pd.option_context('display.max_rows', None, 'display.max_columns', None, 'display.width', 120):
        print(top.to_string(index=False))
    print(f"\nSaved per-residue table to: {out_csv}")
    return df, designs

if __name__ == "__main__":
  _receptor_segids = [s.strip() for s in RECEPTOR_SEGIDS.split(",") if s.strip()]
  _binder_segids   = [s.strip() for s in BINDER_SEGIDS.split(",")   if s.strip()]
  _ligand_resname  = LIGAND_RESNAME.strip() or None
  
  pdb_list = collect_structures(INPUT_DIR, GLOB_PATTERN)
  df_results, n_designs = analyze_cxcr4_from_pdbs(
      pdb_files=pdb_list,
      receptor_segids=_receptor_segids if _receptor_segids else None,
      binder_segids=_binder_segids if _binder_segids else None,
      ligand_resname=_ligand_resname,
      contact_cutoff=CONTACT_CUTOFF_ANG,
      delta_sasa_thresh=DELTA_SASA_THRESH,
      out_csv=OUT_CSV
  )
  df_results
