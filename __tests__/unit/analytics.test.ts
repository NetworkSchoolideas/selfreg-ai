// Unit tests for analytics components

interface ClassDistribution {
  className: string;
  count: number;
}

interface ProgressStats {
  totalSessions: number;
  completedSessions: number;
  averageScore?: number;
  lastActivity?: string;
}

describe('Analytics Data Processing', () => {
  describe('Class Distribution', () => {
    it('should calculate class distribution correctly', () => {
      const children = [
        { className: '5A' },
        { className: '5A' },
        { className: '5B' },
        { className: '5A' },
        { className: '5C' },
      ];

      const classes = [...new Set(children.map((c: any) => c.className))];
      const distribution = classes.map((className: string) => ({
        className,
        count: children.filter((c: any) => c.className === className).length,
      }));

      expect(distribution.find(d => d.className === '5A')?.count).toBe(3);
      expect(distribution.find(d => d.className === '5B')?.count).toBe(1);
      expect(distribution.find(d => d.className === '5C')?.count).toBe(1);
    });

    it('should handle empty children list', () => {
      const children: any[] = [];
      const classes = [...new Set(children.map((c: any) => c.className))];
      expect(classes.length).toBe(0);
    });
  });

  describe('Progress Stats', () => {
    it('should calculate progress percentage', () => {
      const stats: ProgressStats = {
        totalSessions: 10,
        completedSessions: 7,
      };

      const progressPercent = (stats.completedSessions / stats.totalSessions) * 100;
      expect(progressPercent).toBe(70);
    });

    it('should handle zero total sessions', () => {
      const stats: ProgressStats = {
        totalSessions: 0,
        completedSessions: 0,
      };

      const progressPercent = stats.totalSessions === 0 ? 0 : (stats.completedSessions / stats.totalSessions) * 100;
      expect(progressPercent).toBe(0);
    });

    it('should format last activity date', () => {
      const date = new Date('2024-01-15');
      const formatted = date.toLocaleDateString('ru-RU');
      expect(formatted).toBe('15.01.2024');
    });
  });

  describe('Total Statistics', () => {
    it('should calculate total sessions', () => {
      const children = [
        { totalSessions: 5 },
        { totalSessions: 10 },
        { totalSessions: 3 },
      ];

      const total = children.reduce((sum, child) => sum + child.totalSessions, 0);
      expect(total).toBe(18);
    });

    it('should handle missing session data', () => {
      const children = [
        { totalSessions: 5 },
        { totalSessions: undefined },
        { totalSessions: null },
      ];

      const total = children.reduce((sum, child) => sum + (child.totalSessions || 0), 0);
      expect(total).toBe(5);
    });
  });
});