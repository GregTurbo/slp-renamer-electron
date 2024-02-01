const setButton = document.getElementById('btn')

setButton.addEventListener('click', async () => {
  const value = await window.electronAPI.selectFolder();
  console.log(value);
})
