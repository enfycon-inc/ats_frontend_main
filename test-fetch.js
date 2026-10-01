fetch('http://127.0.0.1:5000/api/market-segments')
  .then(res => res.text().then(text => console.log(res.status, text)))
  .catch(err => console.error(err));
