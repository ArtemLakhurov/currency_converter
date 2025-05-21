const BASE_URL = 'http://localhost:3000/api';
const TOKEN = 'mySuperSecretToken'; // той же, що й API_KEY на сервері
const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${TOKEN}`,
};

/* --- завантажити курси й заповнити списки --- */
async function loadCurrencies() {
  const res = await fetch(`${BASE_URL}/rates`, { headers });
  const data = await res.json();
  const opts = data
    .map((r) => `<option value="${r.ccy}">${r.ccy}</option>`)
    .join('');
  ['fromCurrency', 'toCurrency'].forEach((id) => {
    document.getElementById(id).innerHTML = opts;
  });
  document.getElementById('toCurrency').value = 'UAH';
}

/* --- показати історію --- */
async function loadHistory() {
  const res = await fetch(`${BASE_URL}/history`, { headers });
  const hist = await res.json();
  const rows = hist
    .slice()
    .reverse()
    .map(
      (h) => `
    <tr>
      <td>${new Date(h.time).toLocaleString()}</td>
      <td>${h.amount} ${h.from}</td>
      <td>${h.to}</td>
      <td>${h.amount}</td>
      <td>${h.converted}</td>
    </tr>`
    )
    .join('');
  document.querySelector('#historyTable tbody').innerHTML =
    rows || `<tr><td colspan="5">No conversions yet</td></tr>`;
}

/* --- конвертація --- */
document.getElementById('convertBtn').addEventListener('click', async () => {
  const from = document.getElementById('fromCurrency').value;
  const to = document.getElementById('toCurrency').value;
  const amount = parseFloat(document.getElementById('amount').value);
  if (!amount || amount <= 0) return alert('Enter valid amount');

  const res = await fetch(`${BASE_URL}/convert`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ from, to, amount }),
  });
  const data = await res.json();

  if (res.ok) {
    const { converted } = data.results[0];
    document.getElementById(
      'result'
    ).textContent = `${amount} ${from} = ${converted} ${to}`;
    await loadHistory();
  } else {
    document.getElementById('result').textContent = data.error || 'Error';
  }
});

/* init */
loadCurrencies().then(loadHistory);
