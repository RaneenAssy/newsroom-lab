import { IconChartHistogram, IconCoins, IconDashboard } from '@tabler/icons-react'
import React from 'react'

import type { MenuIconName, TablerIconName } from '../menu/menuItems'
import { materialIconShapes, type MaterialIconName } from './materialIconShapes'

const tablerIcons: Record<TablerIconName, typeof IconDashboard> = { IconDashboard, IconChartHistogram, IconCoins }

/** A Material icon drawn from its copied SVG shapes, at production's sidebar size (24px, filled with the current colour). */
export const MaterialIcon: React.FC<{ name: MaterialIconName; size?: number }> = ({ name, size = 24 }) => (
  <svg aria-hidden="true" fill="currentColor" focusable="false" height={size} viewBox="0 0 24 24" width={size}>
    {materialIconShapes[name].map((shape, index) =>
      shape.tag === 'circle' ? <circle cx={shape.cx} cy={shape.cy} key={index} r={shape.r} /> : <path d={shape.d} key={index} />,
    )}
  </svg>
)

/** Sidebar icon: Tabler for the Dashboard group (stroke 1.5, 20px, as production), Material for the rest. */
export const MenuIcon: React.FC<{ icon: MenuIconName }> = ({ icon }) => {
  if (icon.set === 'material') return <MaterialIcon name={icon.name} />
  const TablerIcon = tablerIcons[icon.name]
  return <TablerIcon size={20} stroke={1.5} />
}
