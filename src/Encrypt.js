import P from 'bluebird'
import kbpgp from 'kbpgp'

const importFromArmoredPgp = P.promisify(kbpgp.KeyManager.import_from_armored_pgp)
const unbox = P.promisify(kbpgp.unbox)

export async function verify (user, message) {
  try {
    const publicKey = await window.fetch(`https://keybase.io/${user}/key.asc`)
        .then((res) => res.text())

    const keyManager = await importFromArmoredPgp({armored: publicKey})
        .then((keyManager) => keyManager)

    const fingerprint = keyManager.get_pgp_fingerprint_str()
    const ring = new kbpgp.keyring.KeyRing()

    ring.add_key_manager(keyManager)

    const literal = await unbox({ keyfetch: ring, armored: message })
        .then((literals) => literals.shift())

    // @TODO: Signer might be empty. Detect and fail gracefully
    const signer = literal.get_data_signer()
    const signerKeyManager = signer.get_key_manager()
    const signatureFingerprint = signerKeyManager.get_pgp_fingerprint_str()

    return Promise.resolve({legit: fingerprint === signatureFingerprint, err: null})
  } catch (err) {
    return Promise.reject({legit: false, err: err})
  }
}
