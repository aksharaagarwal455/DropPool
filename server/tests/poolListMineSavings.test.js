const Pool = require('../src/models/Pool')
const { listMine } = require('../src/services/poolService')

describe('poolService.listMine savings and individualTotal calculation', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('calculates savingsPaise and individualTotalPaise correctly for host and members', async () => {
    const userId = 'user_aarav_123'
    const mockPools = [
      {
        _id: 'pool_001',
        code: 'DP-A1B2C3',
        platform: 'blinkit',
        status: 'completed',
        hostUserId: userId,
        members: [
          { userId, finalSharePaise: 9500, estimatedSharePaise: 9500 },
          { userId: 'user_other_456', finalSharePaise: 11000, estimatedSharePaise: 11000 },
        ],
        optimization: {
          members: [
            { id: userId, individualTotalPaise: 13000, sharePaise: 9500 },
            { id: 'user_other_456', individualTotalPaise: 14500, sharePaise: 11000 },
          ],
        },
        createdAt: new Date('2026-03-01T10:00:00Z'),
        isDemo: true,
      },
      {
        _id: 'pool_002',
        code: 'DP-D4E5F6',
        platform: 'zepto',
        status: 'proposed',
        hostUserId: 'user_other_789',
        members: [
          { userId, estimatedSharePaise: 8200 },
          { userId: 'user_other_789', estimatedSharePaise: 8200 },
        ],
        optimization: {
          members: [
            { id: userId, individualTotalPaise: 12000, sharePaise: 8200 },
            { id: 'user_other_789', individualTotalPaise: 12000, sharePaise: 8200 },
          ],
        },
        createdAt: new Date('2026-03-02T12:00:00Z'),
        isDemo: false,
      },
    ]

    const sortMock = jest.fn().mockReturnValue({
      limit: jest.fn().mockResolvedValue(mockPools),
    })
    jest.spyOn(Pool, 'find').mockReturnValue({ sort: sortMock })

    const result = await listMine(userId)

    expect(result).toHaveLength(2)
    // Pool 1 (completed, user is host)
    expect(result[0].id).toBe('pool_001')
    expect(result[0].code).toBe('DP-A1B2C3')
    expect(result[0].isHost).toBe(true)
    expect(result[0].mySharePaise).toBe(9500)
    expect(result[0].individualTotalPaise).toBe(13000)
    expect(result[0].savingsPaise).toBe(3500) // 13000 - 9500 = 3500

    // Pool 2 (proposed, user is member)
    expect(result[1].id).toBe('pool_002')
    expect(result[1].code).toBe('DP-D4E5F6')
    expect(result[1].isHost).toBe(false)
    expect(result[1].mySharePaise).toBe(8200)
    expect(result[1].individualTotalPaise).toBe(12000)
    expect(result[1].savingsPaise).toBe(3800) // 12000 - 8200 = 3800
  })

  test('handles pools without optimization gracefully', async () => {
    const userId = 'user_aarav_123'
    const mockPools = [
      {
        _id: 'pool_003',
        code: 'DP-X9Y8Z7',
        platform: 'instamart',
        status: 'cancelled',
        hostUserId: userId,
        members: [{ userId }],
        optimization: null,
        createdAt: new Date(),
        isDemo: true,
      },
    ]

    const sortMock = jest.fn().mockReturnValue({
      limit: jest.fn().mockResolvedValue(mockPools),
    })
    jest.spyOn(Pool, 'find').mockReturnValue({ sort: sortMock })

    const result = await listMine(userId)
    expect(result).toHaveLength(1)
    expect(result[0].individualTotalPaise).toBeNull()
    expect(result[0].savingsPaise).toBeNull()
  })
})
