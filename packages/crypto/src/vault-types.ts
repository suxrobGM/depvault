export interface VaultInfo {
  kekSalt: string;
  kekIterations: number;
  publicKey: string;
  wrappedPrivateKey: string;
  wrappedPrivateKeyIv: string;
  wrappedPrivateKeyTag: string;
  recoveryKeyHash: string;
  wrappedRecoveryKey: string;
  wrappedRecoveryKeyIv: string;
  wrappedRecoveryKeyTag: string;
}

export interface VaultKeys {
  kek: CryptoKey;
  privateKey: CryptoKey;
  recoveryKey: CryptoKey;
}

export interface VaultSetupResult {
  keys: VaultKeys;
  vaultInfo: VaultInfo;
  recoveryKey: string;
}

export interface PasswordChangeResult {
  kek: CryptoKey;
  kekSalt: string;
  kekIterations: number;
  wrappedPrivateKey: string;
  wrappedPrivateKeyIv: string;
  wrappedPrivateKeyTag: string;
  wrappedRecoveryKey: string;
  wrappedRecoveryKeyIv: string;
  wrappedRecoveryKeyTag: string;
}

export interface RecoverVaultResult {
  keys: VaultKeys;
  vaultInfo: VaultInfo;
}

export interface RegenerateRecoveryKeyResult {
  recoveryKey: string;
  recoveryKeyCryptoKey: CryptoKey;
}
