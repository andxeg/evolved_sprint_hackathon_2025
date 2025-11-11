import { blue } from './base-colors/blue'
import { gray } from './base-colors/gray'
import { green } from './base-colors/green'
import { neutral } from './base-colors/neutral'
import { orange } from './base-colors/orange'
import { red } from './base-colors/red'
import { rose } from './base-colors/rose'
import { slate } from './base-colors/slate'
import { stone } from './base-colors/stone'
import { violet } from './base-colors/violet'
import { yellow } from './base-colors/yellow'
import { zinc } from './base-colors/zinc'

export const baseColors = [
  zinc,
  slate,
  stone,
  gray,
  neutral,
  red,
  rose,
  orange,
  green,
  blue,
  yellow,
  violet
] as const

export type BaseColor = (typeof baseColors)[number]
