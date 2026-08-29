/** Canvas color themes. The side panels stay neutral; these style the drawing itself. */
export interface CanvasTheme {
  label: string
  workspace: string
  roomFill: string
  grid: string
  wall: string
  sofaFill: string
  ottoFill: string
  objFill: string
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
    workspace: '#f1ecdf',
    roomFill: '#fbf8f1',
    grid: '#d8d2c6',
    wall: '#3d342b',
    sofaFill: '#f5ecda',
    ottoFill: '#ece3d0',
    objFill: '#dfe9ef',
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
    workspace: '#e6ebf1',
    roomFill: '#f8fafc',
    grid: '#cfd9e3',
    wall: '#33414f',
    sofaFill: '#e9eff5',
    ottoFill: '#dbe5ee',
    objFill: '#d3e2ef',
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
    workspace: '#ebe7f2',
    roomFill: '#faf8fd',
    grid: '#d9d0e6',
    wall: '#3f3350',
    sofaFill: '#efe9f7',
    ottoFill: '#e2d8ef',
    objFill: '#dcd3ec',
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
    workspace: '#e7efe6',
    roomFill: '#f7fbf5',
    grid: '#cfdccb',
    wall: '#33452f',
    sofaFill: '#e9f2e4',
    ottoFill: '#dae8d4',
    objFill: '#d0e3d5',
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
    workspace: '#0f3465',
    roomFill: '#154078',
    grid: 'rgba(255,255,255,0.16)',
    wall: '#e8f1ff',
    sofaFill: 'rgba(255,255,255,0.08)',
    ottoFill: 'rgba(255,255,255,0.05)',
    objFill: 'rgba(160,200,255,0.15)',
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
