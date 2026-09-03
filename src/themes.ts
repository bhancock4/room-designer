/** Chrome (toolbar/sidebars/panels) colors, applied as CSS variables. */
export interface ChromeTheme {
  toolbarBg: string
  sideBg: string
  panelBg: string
  border: string
  borderStrong: string
  hover: string
  text: string
  sub: string
  headBg: string
  btnBg: string
  inputBg: string
  accent: string
  accentHover: string
  accentText: string
  danger: string
}

/** Canvas + chrome color themes. */
export interface CanvasTheme {
  label: string
  chrome: ChromeTheme
  workspace: string
  roomFill: string
  grid: string
  wall: string
  sofaFill: string
  ottoFill: string
  objFill: string
  objStroke: string
  doorFill: string
  stroke: string
  bandBack: string
  bandArm: string
  openEdge: string
  text: string
  subText: string
  decor: string
  dimNeutral: string
  roomDim: string
  select: string
  solo: string
  snap: string
  overlapFill: string
  zoneClearFill: string
  zoneClearStroke: string
}

export const THEMES: Record<string, CanvasTheme> = {
  cream: {
    label: 'Cream (default)',
    chrome: { toolbarBg: '#3d342b', sideBg: '#f7f3ea', panelBg: '#ffffff', border: '#e0d9cb', borderStrong: '#b8ae9e', hover: '#efe8da', text: '#2e2820', sub: '#6b5f52', headBg: '#8a7f6f', btnBg: '#f7f3ea', inputBg: '#ffffff', accent: '#2b7de9', accentHover: '#1f6cd4', accentText: '#ffffff', danger: '#b0301c' },
    workspace: '#f1ecdf',
    roomFill: '#fbf8f1',
    grid: '#d8d2c6',
    wall: '#3d342b',
    sofaFill: '#f5ecda',
    ottoFill: '#ece3d0',
    objFill: '#eef4f8',
    objStroke: '#93a7b4',
    doorFill: '#fbf8f1',
    stroke: '#4a3f35',
    bandBack: 'rgba(74,63,53,0.22)',
    bandArm: 'rgba(74,63,53,0.42)',
    openEdge: '#5f9c7a',
    text: '#3d342b',
    subText: '#6b5f52',
    decor: '#6b5f52',
    dimNeutral: '#8a7f6f',
    roomDim: '#7a7062',
    select: '#2b7de9',
    solo: '#e07b1f',
    snap: '#2fa864',
    overlapFill: '#f6d7d2',
    zoneClearFill: 'rgba(46,139,87,0.06)',
    zoneClearStroke: '#a5b0a0',
  },
  grayblue: {
    label: 'Gray-blue',
    chrome: { toolbarBg: '#2e3a46', sideBg: '#eef2f6', panelBg: '#fbfdfe', border: '#d3dde6', borderStrong: '#a8b8c6', hover: '#e2eaf1', text: '#26313d', sub: '#5d6b7a', headBg: '#7d8d9d', btnBg: '#eef2f6', inputBg: '#ffffff', accent: '#2b7de9', accentHover: '#1f6cd4', accentText: '#ffffff', danger: '#b0301c' },
    workspace: '#e6ebf1',
    roomFill: '#f8fafc',
    grid: '#cfd9e3',
    wall: '#33414f',
    sofaFill: '#e9eff5',
    ottoFill: '#dbe5ee',
    objFill: '#f0f6fb',
    objStroke: '#94a8ba',
    doorFill: '#f8fafc',
    stroke: '#41505f',
    bandBack: 'rgba(65,80,95,0.20)',
    bandArm: 'rgba(65,80,95,0.40)',
    openEdge: '#569b7d',
    text: '#2c3846',
    subText: '#5d6b7a',
    decor: '#5d6b7a',
    dimNeutral: '#7f8fa0',
    roomDim: '#6e7f90',
    select: '#2b7de9',
    solo: '#e07b1f',
    snap: '#2fa864',
    overlapFill: '#f4d3d3',
    zoneClearFill: 'rgba(46,139,87,0.06)',
    zoneClearStroke: '#9db0a5',
  },
  purple: {
    label: 'Light purple',
    chrome: { toolbarBg: '#372c46', sideBg: '#f1edf7', panelBg: '#fcfaff', border: '#dcd2e9', borderStrong: '#b3a4c9', hover: '#e9e1f3', text: '#2f2740', sub: '#665a7a', headBg: '#8b7ba4', btnBg: '#f1edf7', inputBg: '#ffffff', accent: '#7048c9', accentHover: '#5d38ad', accentText: '#ffffff', danger: '#b0301c' },
    workspace: '#ebe7f2',
    roomFill: '#faf8fd',
    grid: '#d9d0e6',
    wall: '#3f3350',
    sofaFill: '#efe9f7',
    ottoFill: '#e2d8ef',
    objFill: '#edf2f8',
    objStroke: '#98a5bb',
    doorFill: '#faf8fd',
    stroke: '#4c3f61',
    bandBack: 'rgba(76,63,97,0.20)',
    bandArm: 'rgba(76,63,97,0.40)',
    openEdge: '#569b7d',
    text: '#352b45',
    subText: '#665a7a',
    decor: '#665a7a',
    dimNeutral: '#8b7fa2',
    roomDim: '#7b6f92',
    select: '#7048c9',
    solo: '#e07b1f',
    snap: '#2fa864',
    overlapFill: '#f4d3d3',
    zoneClearFill: 'rgba(46,139,87,0.06)',
    zoneClearStroke: '#a9a0bb',
  },
  green: {
    label: 'Light green',
    chrome: { toolbarBg: '#2e3c2a', sideBg: '#eef4ec', panelBg: '#fafdf8', border: '#d3e0cd', borderStrong: '#a9bda1', hover: '#e3eddf', text: '#27341f', sub: '#5c6e54', headBg: '#7c9070', btnBg: '#eef4ec', inputBg: '#ffffff', accent: '#2e8b57', accentHover: '#247247', accentText: '#ffffff', danger: '#b0301c' },
    workspace: '#e7efe6',
    roomFill: '#f7fbf5',
    grid: '#cfdccb',
    wall: '#33452f',
    sofaFill: '#e9f2e4',
    ottoFill: '#dae8d4',
    objFill: '#edf3f6',
    objStroke: '#8fa5ad',
    doorFill: '#f7fbf5',
    stroke: '#3f5239',
    bandBack: 'rgba(63,82,57,0.20)',
    bandArm: 'rgba(63,82,57,0.40)',
    openEdge: '#3f8f68',
    text: '#2b3a26',
    subText: '#5c6e54',
    decor: '#5c6e54',
    dimNeutral: '#7f9377',
    roomDim: '#6f8368',
    select: '#2b7de9',
    solo: '#e07b1f',
    snap: '#2fa864',
    overlapFill: '#f4d3d3',
    zoneClearFill: 'rgba(46,139,87,0.06)',
    zoneClearStroke: '#93a68d',
  },
  blueprint: {
    label: 'Blueprint',
    chrome: { toolbarBg: '#0b2850', sideBg: '#10345f', panelBg: '#16406f', border: '#28517f', borderStrong: '#3f6795', hover: '#1d4a7c', text: '#e8f1ff', sub: '#b9cdea', headBg: '#0d2c55', btnBg: '#1b4a80', inputBg: '#0f3465', accent: '#63c1ff', accentHover: '#8dd2ff', accentText: '#0b2850', danger: '#ff9c8a' },
    workspace: '#0f3465',
    roomFill: '#154078',
    grid: 'rgba(255,255,255,0.16)',
    wall: '#e8f1ff',
    sofaFill: 'rgba(255,255,255,0.08)',
    ottoFill: 'rgba(255,255,255,0.05)',
    objFill: 'rgba(160,200,255,0.07)',
    objStroke: 'rgba(219,233,255,0.55)',
    doorFill: 'rgba(255,255,255,0.10)',
    stroke: '#dbe9ff',
    bandBack: 'rgba(255,255,255,0.28)',
    bandArm: 'rgba(255,255,255,0.45)',
    openEdge: '#8fe3b0',
    text: '#f0f6ff',
    subText: '#b9cdea',
    decor: '#b9cdea',
    dimNeutral: '#9fb6d8',
    roomDim: '#c5d7f2',
    select: '#63c1ff',
    solo: '#ffb45e',
    snap: '#5ff0a0',
    overlapFill: 'rgba(255,110,110,0.35)',
    zoneClearFill: 'rgba(120,255,180,0.08)',
    zoneClearStroke: '#7fd1a8',
  },
}

export const THEME_KEYS = Object.keys(THEMES)
