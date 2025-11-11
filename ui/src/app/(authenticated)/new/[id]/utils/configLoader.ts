// Client-side utility to get VHH configuration (local state only)
export async function fetchVHHConfig(): Promise<string> {
  // Return default config directly without API calls
  return `# Template Configuration
template_config:
  folding_model: "nbb2"  # Options: "nbb2", "esmfold"
  
  # Hotspot selection parameters
  sasa_threshold: 50.0
  hotspot_strategy: "random"  # Options: "top_k", "random", "none"
  
  # Truncation parameters
  pae_threshold: 30.0
  distance_threshold: 25.0
  gap_penalty: 10.0
  include_surrounding_context: false
  
  # Sequence generation parameters
  plm_model: "esm2-650M"
  sampling_temperature: 0.1
  bias_temperature: 1.0
  omit_amino_acids: "C"
  
  # Structure parameters
  target_chain: "A"
  binder_chain: "H"

# Evaluation Configuration
evaluation_config:
  monomer_folding_model: "nbb2"

# Loss Configuration
loss_config:
  weights_hbond: 2.5
  weights_salt_bridge: 2.0

# Trajectory Configuration
trajectory_config:
  soft_iters: 65
  temp_iters: 25
  hard_iters: 0
  pssm_iters: 10
  greedy_tries: 10
  early_stop_iptm: 0.7
  
  # Optimizer Configuration
  optimizer_type: "schedule_free_sgd"  # Options: "adam", "sgd", "schedule_free_adam", "schedule_free_sgd"
  optimizer_learning_rate: 4e-1
  optimizer_b1: 0.9
  optimizer_b2: 0.999
  optimizer_eps: 1e-8
  optimizer_weight_decay: null
  optimizer_weight_lr_power: 2.0
  optimizer_warmup_steps: null`
}
