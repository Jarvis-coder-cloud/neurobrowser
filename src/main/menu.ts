import { app, BrowserWindow, Menu } from 'electron';

type GetMainWindow = () => BrowserWindow | null;

export function registerAppMenu(getMainWindow: GetMainWindow) {
  const isMac = process.platform === 'darwin';

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? ([
          {
            label: appName(),
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ] as Electron.MenuItemConstructorOptions[])
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New tab',
          accelerator: 'CmdOrCtrl+T',
          click: () => getMainWindow()?.webContents.send('menu:new-tab'),
        },
        {
          label: 'Close tab',
          accelerator: 'CmdOrCtrl+W',
          click: () => getMainWindow()?.webContents.send('menu:close-tab'),
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Bookmarks bar',
          accelerator: isMac ? 'Cmd+Shift+B' : 'Ctrl+Shift+B',
          click: () => getMainWindow()?.webContents.send('menu:toggle-bookmarks-bar'),
        },
        { type: 'separator' },
        {
          label: 'History',
          accelerator: 'CmdOrCtrl+H',
          click: () => getMainWindow()?.webContents.send('menu:open-history'),
        },
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => getMainWindow()?.webContents.send('menu:open-settings'),
        },
        { type: 'separator' },
        {
          label: 'Toggle developer tools',
          accelerator: 'F12',
          click: () => getMainWindow()?.webContents.send('menu:toggle-devtools'),
        },
        { role: 'togglefullscreen' },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function appName(): string {
  return app.name;
}
