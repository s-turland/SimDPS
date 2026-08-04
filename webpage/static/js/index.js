/* Copy-to-clipboard for the BibTeX block. Everything audio related is in demo.js. */

function copyBibTeX() {
  const bibtex = document.getElementById('bibtex-code');
  const button = document.querySelector('.copy-bibtex-btn');
  if (!bibtex || !button) return;

  const confirm = function () {
    button.classList.add('copied');
    setTimeout(function () {
      button.classList.remove('copied');
    }, 2000);
  };

  const fallback = function () {
    const area = document.createElement('textarea');
    area.value = bibtex.textContent;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    document.body.removeChild(area);
    confirm();
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(bibtex.textContent).then(confirm, fallback);
  } else {
    fallback();
  }
}
