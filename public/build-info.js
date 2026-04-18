;(function () {
  const script = document.currentScript
  if (!script) {
    return
  }
  const search = new URLSearchParams(script.src.split('?').pop())
  const date = new Date(search.get('time') - 0)
  const hash = search.get('hash')
  const buildTime = date.toLocaleString()
  window._buildDate = date.toLocaleDateString()
  console.log(
    `%c Build: ${buildTime} ${hash} `,
    'background-color: #4DBA87; color: #fff; padding: 2px; border-radius: 2px;',
  )
})()
