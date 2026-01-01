/**
 * Garmin SDK Adapter for Jest testing
 *
 * Minimal mocks for @microsoft/msfs-garminsdk required by StormScope components.
 * Goal: exercise the unit-test framework, not re-implement Garmin SDK.
 */

// IMPORTANT: This adapter is part of the test framework and should not depend on
// the real SDK runtime/types. Import from our own SDKAdapter instead.
import { DisplayComponent, FSComponent, Subject } from './SDKAdapter';

// -----------------------------
// Enums / constants
// -----------------------------

export enum WeatherRadarOperatingMode {
  Weather = 'Weather',
}

export enum WeatherRadarScanMode {
  Horizontal = 'Horizontal',
}

export enum MapTerrainMode {
  None = 'None',
  Absolute = 'Absolute',
  Relative = 'Relative',
  Ground = 'Ground',
}

export enum MapOrientation {
  NorthUp = 'NorthUp',
}

export enum UnitsDistanceSettingMode {
  Nautical = 'Nautical',
}

export const GarminMapKeys = {
  Units: 'Units',
  Range: 'Range',
  Terrain: 'Terrain',
  Declutter: 'Declutter',
  Orientation: 'Orientation',
  Nexrad: 'Nexrad',
} as const;

// -----------------------------
// Module stubs used by map manager
// -----------------------------

export class MapUnitsModule {
  constructor(_settingManager?: any) {}
}

export class MapDeclutterModule {}

export class MapNexradModule {
  public readonly showNexrad = Subject.create<boolean>(false);
}

export class MapOrientationModule {
  public readonly orientation = Subject.create<MapOrientation>(MapOrientation.NorthUp);
}

export type MapTerrainColorsDefinition = any;

export class MapTerrainModule {
  public readonly terrainMode = Subject.create<MapTerrainMode>(MapTerrainMode.Absolute);
}

export type MapWxrControllerModules = any;
export class MapWxrController {
  constructor(_context: any) {}
}

// -----------------------------
// Range controller used by StormScopeMapManager
// -----------------------------

export class MapRangeController {
  private rangeIndex = 0;
  constructor(
    private readonly rangeValues: any[] = [],
    private readonly nominalRange: Subject<any>
  ) {}

  public changeRangeIndex(delta: number): void {
    this.setRangeIndex(this.rangeIndex + delta);
  }

  public setRangeIndex(index: number): void {
    const clamped = Math.max(0, Math.min(index, this.rangeValues.length - 1));
    this.rangeIndex = clamped;
    const val = this.rangeValues[clamped];
    if (val !== undefined) {
      this.nominalRange.set(val);
    }
  }
}

// -----------------------------
// GarminMapBuilder tokens (consumed by MapSystemBuilder.with())
// -----------------------------

export const GarminMapBuilder = {
  range: Symbol('GarminMapBuilder.range'),
  orientation: Symbol('GarminMapBuilder.orientation'),
  declutter: Symbol('GarminMapBuilder.declutter'),
  terrainColors: Symbol('GarminMapBuilder.terrainColors'),
} as const;

// -----------------------------
// WeatherRadar component mock
// -----------------------------

export interface WeatherRadarProps {
  bingId: string;
  bus: any;
  ref?: any;
  [key: string]: any;
}

export class WeatherRadar extends DisplayComponent<WeatherRadarProps> {
  public rootElement: any = null;
  public update = jest.fn();
  public wake = jest.fn();
  public sleep = jest.fn();

  public render(): any {
    const vnode = FSComponent.buildComponent('div', {
      id: `weather-radar-${this.props.bingId}`,
      class: 'weather-radar',
    });
    this.rootElement = vnode?.instance ?? null;
    return vnode;
  }
}

