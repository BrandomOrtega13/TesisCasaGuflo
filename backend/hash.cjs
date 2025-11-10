const bcrypt = require('bcrypt');

(async () => {
  const password = '203820';
  const hash = await bcrypt.hash(password, 10);
  console.log('Hash generado:', hash);
})();
