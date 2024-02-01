const { app, BrowserWindow, ipcMain, dialog} = require('electron/main');
const path = require('node:path');
const { fork } = require('child_process');

async function handleFileOpen () {
  const { canceled, filePaths } = await dialog.showOpenDialog(
    {
      properties: ['openDirectory']
    }
  )
  let args = ['-r'];
  args.push(filePaths[0]);
  const child = fork(path.join(__dirname, 'slp_rename.js'),
  args, {
    //silent: true,
    //detached: true,
    // stdio: 'ignore',
    env: {
        ELECTRON_RUN_AS_NODE:1
    }
  }); 
  if (!canceled) {
    return filePaths[0]
  }
  return null
}


const createWindow = () => {
  const win = new BrowserWindow({
    width: 400,
    height: 200,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: true
    }
  })
  win.removeMenu(); 
  win.loadFile('index.html')
}



app.whenReady().then(() => {
  ipcMain.handle('dialog:openDirectory', handleFileOpen)
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
