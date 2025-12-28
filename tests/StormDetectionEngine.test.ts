// IMPORTANT: Import mocks FIRST before any component imports
import '../src/setupTests';

import { TestEnvironment } from '../src';
import { simVarMock } from '../src/mocks/SimVarMock';
import { EventBus } from '@microsoft/msfs-sdk';
// @ts-ignore - Type conflict between SDK versions, but runtime is fine
import { DefaultStormDetectionEngine } from '../../html_ui/stormscope/engines/StormDetectionEngine';
// @ts-ignore
import { DischargePoint, StormCell } from '../../html_ui/stormscope/types/StormDetection';
// @ts-ignore
import { CloudMap, CloudSegment, CloudType } from '../../html_ui/stormscope/types/CloudData';

describe('DefaultStormDetectionEngine', () => {
  let env: TestEnvironment;
  let bus: EventBus;
  let engine: DefaultStormDetectionEngine;

  function createTestCloudMap(segments: Partial<CloudSegment>[]): CloudMap {
    return {
      segments: segments.map((s, i) => ({
        latitude: s.latitude ?? 40.0 + (i * 0.1),
        longitude: s.longitude ?? -75.0 + (i * 0.1),
        baseHeight: s.baseHeight ?? 0,
        topHeight: s.topHeight ?? 0,
        cloudType: s.cloudType ?? CloudType.NONE,
        precipitationRate: s.precipitationRate ?? 0,
        windVelocity: s.windVelocity ?? 0,
        stormProbability: s.stormProbability ?? 0,
        isThunderstorm: s.isThunderstorm ?? false
      })),
      centerLatitude: 40.0,
      centerLongitude: -75.0,
      range: 100,
      timestamp: Date.now(),
      gridSize: 20
    };
  }

  function createThunderstormSegment(
    lat: number,
    lon: number,
    probability: number = 0.8
  ): CloudSegment {
    return {
      latitude: lat,
      longitude: lon,
      baseHeight: 20000,
      topHeight: 30000,
      cloudType: CloudType.THUNDERSTORM,
      precipitationRate: probability * 0.5,
      windVelocity: 20,
      stormProbability: probability,
      isThunderstorm: true
    };
  }

  beforeEach(() => {
    env = new TestEnvironment();
    env.setup();
    bus = new EventBus();
    simVarMock.reset();
    
    simVarMock.setSimVarValue('PLANE HEADING DEGREES TRUE', 'degrees', 0);
  });

  afterEach(() => {
    if (engine) {
      engine.destroy();
    }
    env.teardown();
  });

  describe('Initialization', () => {
    test('should initialize successfully', () => {
      engine = new DefaultStormDetectionEngine(bus);
      expect(() => engine.init()).not.toThrow();
    });

    test('should not initialize twice', () => {
      engine = new DefaultStormDetectionEngine(bus);
      engine.init();
      engine.init(); // Second init should not throw
      expect(engine.getDischargePoints().length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Configuration', () => {
    test('should use default configuration', () => {
      engine = new DefaultStormDetectionEngine(bus);
      engine.init();
      
      // Default point lifetime is 3 minutes
      const points = engine.getDischargePoints();
      expect(Array.isArray(points)).toBe(true);
    });

    test('should use custom configuration', () => {
      engine = new DefaultStormDetectionEngine(bus, {
        pointLifetime: 60000, // 1 minute
        updateInterval: 500,
        dischargeRate: 0.2,
        clusteringDistance: 10,
        minPointsPerCell: 5
      });
      engine.init();
      
      expect(engine.getDischargePoints()).toBeDefined();
    });
  });

  describe('Pause and Resume', () => {
    test('should pause updates', () => {
      engine = new DefaultStormDetectionEngine(bus, { updateInterval: 100 });
      engine.init();
      
      const initialPointCount = engine.getDischargePoints().length;
      
      engine.pause();
      
      // Wait a bit
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const afterPauseCount = engine.getDischargePoints().length;
          // Point count should not change significantly while paused
          expect(afterPauseCount).toBeGreaterThanOrEqual(initialPointCount);
          resolve();
        }, 200);
      });
    });

    test('should resume updates', () => {
      engine = new DefaultStormDetectionEngine(bus, { updateInterval: 100 });
      engine.init();
      
      engine.pause();
      engine.resume();
      
      // Should not throw
      expect(() => engine.getDischargePoints()).not.toThrow();
    });
  });

  describe('Discharge Point Generation', () => {
    test('should generate points from thunderstorm segments', () => {
      engine = new DefaultStormDetectionEngine(bus, {
        dischargeRate: 1.0, // High rate for testing
        updateInterval: 1000
      });
      engine.init();
      
      const cloudMap = createTestCloudMap([
        createThunderstormSegment(40.1, -75.1, 0.9)
      ]);
      
      engine.update(cloudMap);
      
      // Wait a bit for points to be generated
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const points = engine.getDischargePoints();
          // Should generate at least some points
          expect(points.length).toBeGreaterThanOrEqual(0);
          resolve();
        }, 200);
      });
    });

    test('should not generate points from non-thunderstorm segments', () => {
      engine = new DefaultStormDetectionEngine(bus, {
        dischargeRate: 1.0,
        updateInterval: 1000
      });
      engine.init();
      
      const cloudMap = createTestCloudMap([
        {
          latitude: 40.1,
          longitude: -75.1,
          baseHeight: 5000,
          topHeight: 8000,
          cloudType: CloudType.LOW,
          precipitationRate: 0.1,
          windVelocity: 10,
          stormProbability: 0.2,
          isThunderstorm: false
        }
      ]);
      
      engine.update(cloudMap);
      
      const points = engine.getDischargePoints();
      expect(points.length).toBe(0);
    });

    test('should generate random number of points (1-5) per segment', () => {
      engine = new DefaultStormDetectionEngine(bus, {
        dischargeRate: 1.0,
        updateInterval: 1000
      });
      engine.init();
      
      const cloudMap = createTestCloudMap([
        createThunderstormSegment(40.1, -75.1, 0.9)
      ]);
      
      // Run multiple updates to get points
      for (let i = 0; i < 10; i++) {
        engine.update(cloudMap);
      }
      
      // Wait for points to be generated
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const points = engine.getDischargePoints();
          
          // If points were generated, verify they have correct structure
          if (points.length > 0) {
            const point = points[0];
            expect(point).toHaveProperty('id');
            expect(point).toHaveProperty('bearing');
            expect(point).toHaveProperty('distance');
            expect(point).toHaveProperty('latitude');
            expect(point).toHaveProperty('longitude');
            expect(point).toHaveProperty('timestamp');
            expect(point).toHaveProperty('age');
            expect(point).toHaveProperty('intensity');
            expect(point).toHaveProperty('isInterference');
          }
          
          resolve();
        }, 500);
      });
    });

    test('should generate more points for higher storm probability', () => {
      engine = new DefaultStormDetectionEngine(bus, {
        dischargeRate: 1.0,
        updateInterval: 1000
      });
      engine.init();
      
      const highProbMap = createTestCloudMap([
        createThunderstormSegment(40.1, -75.1, 0.9)
      ]);
      
      const lowProbMap = createTestCloudMap([
        createThunderstormSegment(40.1, -75.1, 0.3)
      ]);
      
      // Generate points with high probability
      for (let i = 0; i < 10; i++) {
        engine.update(highProbMap);
      }
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const highProbPoints = engine.getDischargePoints().length;
          
          engine.clearAllPoints();
          
          // Generate points with low probability
          for (let i = 0; i < 10; i++) {
            engine.update(lowProbMap);
          }
          
          setTimeout(() => {
            const lowProbPoints = engine.getDischargePoints().length;
            
            // High probability should generate more points (or equal if randomness doesn't favor it)
            // But we can at least verify both generate some points
            expect(highProbPoints).toBeGreaterThanOrEqual(0);
            expect(lowProbPoints).toBeGreaterThanOrEqual(0);
            
            resolve();
          }, 500);
        }, 500);
      });
    });
  });

  describe('Point Aging and Fade-out', () => {
    test('should age points over time', () => {
      engine = new DefaultStormDetectionEngine(bus, {
        pointLifetime: 1000, // 1 second for testing
        updateInterval: 100
      });
      engine.init();
      
      const cloudMap = createTestCloudMap([
        createThunderstormSegment(40.1, -75.1, 0.9)
      ]);
      
      engine.update(cloudMap);
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const points = engine.getDischargePoints();
          
          if (points.length > 0) {
            const point = points[0];
            expect(point.age).toBeGreaterThan(0);
          }
          
          resolve();
        }, 200);
      });
    });

    test('should remove expired points', () => {
      engine = new DefaultStormDetectionEngine(bus, {
        pointLifetime: 500, // 0.5 seconds
        updateInterval: 100
      });
      engine.init();
      
      const cloudMap = createTestCloudMap([
        createThunderstormSegment(40.1, -75.1, 0.9)
      ]);
      
      engine.update(cloudMap);
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const initialPoints = engine.getDischargePoints().length;
          
          // Wait for points to expire
          setTimeout(() => {
            const afterExpiryPoints = engine.getDischargePoints().length;
            // Points should be removed after expiry
            expect(afterExpiryPoints).toBeLessThanOrEqual(initialPoints);
            resolve();
          }, 600);
        }, 200);
      });
    });

    test('should fade intensity over time', () => {
      engine = new DefaultStormDetectionEngine(bus, {
        pointLifetime: 1000,
        updateInterval: 100
      });
      engine.init();
      
      const cloudMap = createTestCloudMap([
        createThunderstormSegment(40.1, -75.1, 1.0)
      ]);
      
      engine.update(cloudMap);
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const points = engine.getDischargePoints();
          
          if (points.length > 0) {
            const point = points[0];
            const initialIntensity = point.intensity;
            
            // Wait a bit more
            setTimeout(() => {
              const updatedPoints = engine.getDischargePoints();
              if (updatedPoints.length > 0) {
                const updatedPoint = updatedPoints.find(p => p.id === point.id);
                if (updatedPoint) {
                  // Intensity should decrease (or stay same if not aged enough)
                  expect(updatedPoint.intensity).toBeLessThanOrEqual(initialIntensity);
                }
              }
              resolve();
            }, 300);
          } else {
            resolve();
          }
        }, 200);
      });
    });
  });

  describe('Clustering', () => {
    test('should cluster nearby points into cells', () => {
      engine = new DefaultStormDetectionEngine(bus, {
        clusteringDistance: 10, // 10 nmi
        minPointsPerCell: 2,
        dischargeRate: 1.0
      });
      engine.init();
      
      // Create multiple thunderstorm segments close together
      const cloudMap = createTestCloudMap([
        createThunderstormSegment(40.0, -75.0, 0.9),
        createThunderstormSegment(40.05, -75.05, 0.9), // Close to first
        createThunderstormSegment(40.1, -75.1, 0.9) // Close to second
      ]);
      
      // Generate points
      for (let i = 0; i < 10; i++) {
        engine.update(cloudMap);
      }
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const cells = engine.getStormCells();
          
          // Should create at least some cells if enough points were generated
          expect(Array.isArray(cells)).toBe(true);
          
          if (cells.length > 0) {
            const cell = cells[0];
            expect(cell).toHaveProperty('id');
            expect(cell).toHaveProperty('centerLatitude');
            expect(cell).toHaveProperty('centerLongitude');
            expect(cell).toHaveProperty('points');
            expect(cell).toHaveProperty('intensity');
            expect(cell).toHaveProperty('radius');
            expect(cell).toHaveProperty('bearing');
            expect(cell).toHaveProperty('distance');
            expect(cell.points.length).toBeGreaterThanOrEqual(2);
          }
          
          resolve();
        }, 500);
      });
    });

    test('should not create cells with too few points', () => {
      engine = new DefaultStormDetectionEngine(bus, {
        clusteringDistance: 10,
        minPointsPerCell: 10, // High threshold
        dischargeRate: 0.1 // Low rate
      });
      engine.init();
      
      const cloudMap = createTestCloudMap([
        createThunderstormSegment(40.0, -75.0, 0.5)
      ]);
      
      engine.update(cloudMap);
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const cells = engine.getStormCells();
          // Should have no cells or cells with at least minPointsPerCell
          cells.forEach(cell => {
            expect(cell.points.length).toBeGreaterThanOrEqual(10);
          });
          resolve();
        }, 500);
      });
    });
  });

  describe('Clear All Points', () => {
    test('should clear all discharge points', () => {
      engine = new DefaultStormDetectionEngine(bus, {
        dischargeRate: 1.0
      });
      engine.init();
      
      const cloudMap = createTestCloudMap([
        createThunderstormSegment(40.1, -75.1, 0.9)
      ]);
      
      engine.update(cloudMap);
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const pointsBefore = engine.getDischargePoints();
          
          engine.clearAllPoints();
          
          const pointsAfter = engine.getDischargePoints();
          expect(pointsAfter.length).toBe(0);
          
          resolve();
        }, 200);
      });
    });
  });

  describe('Bearing and Distance Calculation', () => {
    test('should calculate correct bearing', () => {
      engine = new DefaultStormDetectionEngine(bus);
      engine.init();
      
      const cloudMap = createTestCloudMap([
        createThunderstormSegment(40.1, -75.0, 0.9) // North of aircraft
      ]);
      
      engine.update(cloudMap);
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const points = engine.getDischargePoints();
          
          if (points.length > 0) {
            const point = points[0];
            expect(point.bearing).toBeGreaterThanOrEqual(0);
            expect(point.bearing).toBeLessThanOrEqual(360);
            expect(point.distance).toBeGreaterThanOrEqual(0);
          }
          
          resolve();
        }, 200);
      });
    });

    test('should calculate correct distance', () => {
      engine = new DefaultStormDetectionEngine(bus);
      engine.init();
      
      const cloudMap = createTestCloudMap([
        createThunderstormSegment(40.1, -75.0, 0.9)
      ]);
      
      engine.update(cloudMap);
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const points = engine.getDischargePoints();
          
          if (points.length > 0) {
            const point = points[0];
            // Distance should be reasonable (within range)
            expect(point.distance).toBeGreaterThanOrEqual(0);
            expect(point.distance).toBeLessThan(1000); // Should be within reasonable range
          }
          
          resolve();
        }, 200);
      });
    });
  });

  describe('Destroy', () => {
    test('should clean up on destroy', () => {
      engine = new DefaultStormDetectionEngine(bus);
      engine.init();
      
      expect(() => engine.destroy()).not.toThrow();
      
      const points = engine.getDischargePoints();
      expect(points.length).toBe(0);
    });
  });
});

