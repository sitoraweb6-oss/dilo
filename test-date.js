const d = new Date();
const formatted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
console.log(formatted);
