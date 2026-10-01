// FSKTM Floor Plan Data matching kiosk layout:
// 1. Diagonal West Wing (32° angled corridor): Classrooms, Seminar, Labs, Postgrad
// 2. Center Spine: Marked as Office Area / Corridors / Lifts (room boxes excluded)
// 3. Horizontal East Wing: Double-row labs (Top row & Bottom row)
export const FLOOR_PLANS = {
  Ground: {
    name: 'Ground Floor',
    label: 'GROUND FLOOR',
    westWing: {
      angle: -32,
      // Left / Bottom row in the diagonal wing
      rowBottom: [
        { code: 'PANTRY', name: 'Pantry', capacity: 10, category: 'Facility' },
        { code: 'PTM', name: 'Pusat Teknologi Maklumat', capacity: 50, category: 'General Lab' },
        { code: 'BS-03', name: 'Bilik Siswazah 3', capacity: 15, category: 'Postgraduate Room' },
        { code: 'BS-02', name: 'Bilik Siswazah 2', capacity: 15, category: 'Postgraduate Room' },
        { code: 'BS-01', name: 'Bilik Siswazah 1', capacity: 15, category: 'Postgraduate Room' }
      ],
      // Right / Top row in the diagonal wing
      rowTop: [
        { code: 'BS-04', name: 'Bilik Siswazah 4', capacity: 15, category: 'Postgraduate Room' },
        { code: 'BS-05', name: 'Bilik Siswazah 5', capacity: 15, category: 'Postgraduate Room' },
        { code: 'BS-06', name: 'Bilik Siswazah 6', capacity: 15, category: 'Postgraduate Room' },
        { code: 'BPS', name: 'Bilik Pasca Siswazah', capacity: 25, category: 'Postgraduate Room' }
      ]
    },
    eastWing: {
      rowTop: [
        { code: 'MGA', name: 'Makmal Grafik dan Animasi', capacity: 35, category: 'Computer Lab' },
        { code: 'SAV', name: 'Studio Audio dan Video', capacity: 20, category: 'Media Studio' }
      ],
      rowBottom: [
        { code: 'MRM', name: 'Makmal Realiti Maya', capacity: 30, category: 'Specialized Lab' },
        { code: 'MSD', name: 'Makmal Sains Data', capacity: 40, category: 'Computer Lab' }
      ]
    }
  },

  First: {
    name: 'First Floor',
    label: 'FIRST FLOOR',
    westWing: {
      angle: -32,
      rowBottom: [],
      // The first floor has large open learning spaces
      rowTop: [
        { code: 'RMP', name: 'Ruang Membaca Pelajar', capacity: 60, category: 'Study Area', flexSpan: 1 },
        { code: 'MINFO', name: 'Makmal Infosys', capacity: 45, category: 'Computer Lab', flexSpan: 1.5 }
      ]
    },
    eastWing: {
      rowTop: [
        { code: 'MKP', name: 'Makmal Kejuruteraan Perisian', capacity: 40, category: 'Computer Lab' },
        { code: 'ICT-OFC', name: 'Pejabat ICT', capacity: 15, category: 'IT Services' }
      ],
      rowBottom: [
        { code: 'MPP', name: 'Makmal Pembangunan Perisian', capacity: 40, category: 'Computer Lab' },
        { code: 'MPROG', name: 'Makmal Pengaturcaraan', capacity: 45, category: 'Computer Lab' }
      ]
    }
  },

  Second: {
    name: 'Second Floor',
    label: 'SECOND FLOOR',
    westWing: {
      angle: -32,
      rowBottom: [],
      rowTop: [
        { code: 'SEM-2', name: 'Bilik Seminar', capacity: 80, category: 'Seminar Hall', flexSpan: 1.2 },
        { code: 'BT-01', name: 'Bilik Tutorial 1', capacity: 35, category: 'Tutorial Room', flexSpan: 1 },
        { code: 'BT-02', name: 'Bilik Tutorial 2', capacity: 35, category: 'Tutorial Room', flexSpan: 1 },
        { code: 'BT-05', name: 'Bilik Tutorial 5', capacity: 35, category: 'Tutorial Room', flexSpan: 1 }
      ]
    },
    eastWing: {
      rowTop: [
        { code: 'MFD', name: 'Makmal Forensik Digital', capacity: 30, category: 'Security Lab' },
        { code: 'HPA', name: 'Akademi HP Aruba', capacity: 35, category: 'Network Lab' }
      ],
      rowBottom: [
        { code: 'CISCO', name: 'Akademi Rangkaian Cisco', capacity: 35, category: 'Network Lab' },
        { code: 'MKK', name: 'Makmal Keselamatan Komputer', capacity: 30, category: 'Security Lab' }
      ]
    }
  },

  Third: {
    name: 'Third Floor',
    label: 'THIRD FLOOR',
    westWing: {
      angle: -32,
      rowBottom: [],
      rowTop: [
        { code: 'BAS', name: 'Bilik Aktiviti Staf', capacity: 30, category: 'Staff Lounge', flexSpan: 1 },
        { code: 'BT-04', name: 'Bilik Tutorial 4', capacity: 35, category: 'Tutorial Room', flexSpan: 1 },
        { code: 'SCDMC', name: 'Soft Computing and Data Mining Centre', capacity: 40, category: 'Research Lab', flexSpan: 2 }
      ]
    },
    eastWing: {
      rowTop: [
        { code: 'AUD-3', name: 'Auditorium', capacity: 150, category: 'Auditorium' },
        { code: 'MPI', name: 'Makmal Pengaturcaraan Internet', capacity: 40, category: 'Computer Lab' }
      ],
      rowBottom: [
        { code: 'MSK', name: 'Makmal Sistem Komputer', capacity: 40, category: 'Hardware Lab' },
        { code: 'MTW', name: 'Makmal Teknologi Web', capacity: 40, category: 'Computer Lab' }
      ]
    }
  }
};
