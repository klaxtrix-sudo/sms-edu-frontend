const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const MASTER_ENCRYPTION_KEY = "ad95e14cedff69a8beb5fdd451de114860f927f87a11cb1e200787f437d1d641";

function decrypt(ciphertext) {
  const key = Buffer.from(MASTER_ENCRYPTION_KEY, "hex");
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(":");

  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error("Invalid ciphertext format");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

const encUrl = "2c3bcc1f1b0040389f88bf0c:c357e8f245df9347b753f64c3bb98270:5fe25afc365cf4ed5070d621dd5dbac330791104c1b51f79d9f4fc004236d3b2050081ceebef1e45";
try {
  console.log("Decrypted URL:", decrypt(encUrl));
} catch (e) {
  console.error("Decryption failed:", e.message);
}
