const bcrypt = require("bcryptjs");

async function generateHash() {
  const password = "admin123";
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  
  console.log("Password:", password);
  console.log("Bcrypt Hash:", hash);
  console.log("\nYou can use this hash in your database:");
  console.log(hash);
}

generateHash();