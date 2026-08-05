import React, { useState, useEffect } from 'react';
import { Building, MapPin, Users, Search, X } from 'lucide-react';
import assemblyBoothData from '../utils/assemblyBoothData.json';

const AssemblyBoothsPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [sortBy, setSortBy] = useState('assemblyNo'); // 'assemblyNo', 'booths', 'voters', 'name'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc', 'desc'

  // Get unique districts
  const districts = [...new Set(assemblyBoothData.assemblies.map(a => a.district))].sort();

  // Filter and sort assemblies
  const filteredAssemblies = assemblyBoothData.assemblies
    .filter(assembly => {
      const matchesSearch = searchQuery === '' || 
        assembly.assemblyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        assembly.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
        assembly.assemblyNo.toString().includes(searchQuery);
      
      const matchesDistrict = districtFilter === '' || assembly.district === districtFilter;
      
      return matchesSearch && matchesDistrict;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'assemblyNo':
          comparison = a.assemblyNo - b.assemblyNo;
          break;
        case 'booths':
          comparison = a.totalBooths - b.totalBooths;
          break;
        case 'voters':
          comparison = a.totalVoters - b.totalVoters;
          break;
        case 'name':
          comparison = a.assemblyName.localeCompare(b.assemblyName);
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      padding: '24px',
      color: '#fff'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #FF9933 0%, #FF6B35 100%)',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '24px',
          boxShadow: '0 8px 32px rgba(255, 153, 51, 0.3)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{
                fontSize: '36px',
                fontWeight: '800',
                margin: '0 0 8px 0',
                color: '#fff',
                textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
              }}>
                🗳️ Tamil Nadu Assembly Constituencies
              </h1>
              <p style={{ fontSize: '16px', margin: '0 0 16px 0', opacity: 0.95 }}>
                Complete booth information for all 233 assemblies
              </p>
            </div>

            {/* Be a Booth President Call to Action */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '12px',
              padding: '16px 20px',
              backdropFilter: 'blur(8px)',
              maxWidth: '420px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '22px' }}>🏆</span>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#ffffff' }}>
                    Be a Booth President
                  </div>
                  <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.85)' }}>
                    Apply to lead your electoral booth
                  </div>
                </div>
              </div>
              <button
                onClick={() => { window.location.href = '/?action=booth_president'; }}
                style={{
                  background: '#ffffff',
                  color: '#FF6B35',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 18px',
                  fontWeight: '800',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
              >
                <span>Apply to Lead Booth</span>
                <span style={{ fontSize: '15px' }}>&rarr;</span>
              </button>
            </div>
          </div>
          
          {/* Stats Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginTop: '20px'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              padding: '16px',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '4px' }}>
                Total Assemblies
              </div>
              <div style={{ fontSize: '32px', fontWeight: '800' }}>
                {assemblyBoothData.totalAssemblies}
              </div>
            </div>
            
            <div style={{
              background: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              padding: '16px',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '4px' }}>
                Total Booths
              </div>
              <div style={{ fontSize: '32px', fontWeight: '800' }}>
                {assemblyBoothData.totalBooths.toLocaleString()}
              </div>
            </div>
            
            <div style={{
              background: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              padding: '16px',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '4px' }}>
                Total Voters
              </div>
              <div style={{ fontSize: '32px', fontWeight: '800' }}>
                {(assemblyBoothData.totalVoters / 10000000).toFixed(1)}M
              </div>
            </div>
            
            <div style={{
              background: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              padding: '16px',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '4px' }}>
                Avg Booths/Assembly
              </div>
              <div style={{ fontSize: '32px', fontWeight: '800' }}>
                {Math.round(assemblyBoothData.totalBooths / assemblyBoothData.totalAssemblies)}
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '24px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: '1 1 300px', minWidth: '250px' }}>
              <Search size={18} style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#888'
              }} />
              <input
                type="text"
                placeholder="Search assembly name, district, or number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 42px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#888',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* District Filter */}
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                fontSize: '14px',
                cursor: 'pointer',
                outline: 'none',
                minWidth: '200px'
              }}
            >
              <option value="">All Districts</option>
              {districts.map(district => (
                <option key={district} value={district} style={{ background: '#1a1a2e' }}>
                  {district}
                </option>
              ))}
            </select>

            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                fontSize: '14px',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="assemblyNo" style={{ background: '#1a1a2e' }}>Sort by Assembly No</option>
              <option value="name" style={{ background: '#1a1a2e' }}>Sort by Name</option>
              <option value="booths" style={{ background: '#1a1a2e' }}>Sort by Booths</option>
              <option value="voters" style={{ background: '#1a1a2e' }}>Sort by Voters</option>
            </select>

            {/* Sort Order */}
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              style={{
                padding: '12px 20px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
            </button>

            {/* Clear Filters */}
            {(searchQuery || districtFilter) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setDistrictFilter('');
                }}
                style={{
                  padding: '12px 20px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 153, 51, 0.5)',
                  background: 'rgba(255, 153, 51, 0.1)',
                  color: '#FF9933',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Results Count */}
          <div style={{
            marginTop: '12px',
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.7)'
          }}>
            Showing <strong>{filteredAssemblies.length}</strong> of <strong>{assemblyBoothData.assemblies.length}</strong> assemblies
          </div>
        </div>

        {/* Assembly Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '20px'
        }}>
          {filteredAssemblies.map((assembly) => (
            <div
              key={assembly.assemblyNo}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(255, 153, 51, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(255, 153, 51, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              {/* Assembly Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: '800',
                    color: '#FF9933',
                    marginBottom: '4px'
                  }}>
                    {assembly.assemblyNo}
                  </div>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    color: '#fff',
                    marginBottom: '8px'
                  }}>
                    {assembly.assemblyName}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <MapPin size={14} />
                    {assembly.district}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginTop: '16px'
              }}>
                <div style={{
                  background: 'rgba(255, 153, 51, 0.1)',
                  borderRadius: '10px',
                  padding: '12px',
                  border: '1px solid rgba(255, 153, 51, 0.2)'
                }}>
                  <div style={{
                    fontSize: '12px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    marginBottom: '4px'
                  }}>
                    <Building size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    Total Booths
                  </div>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: '800',
                    color: '#FF9933'
                  }}>
                    {assembly.totalBooths === 0 ? (
                      <span style={{ fontSize: '16px', color: '#ef4444' }}>No Data</span>
                    ) : (
                      assembly.totalBooths.toLocaleString()
                    )}
                  </div>
                </div>

                <div style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  borderRadius: '10px',
                  padding: '12px',
                  border: '1px solid rgba(34, 197, 94, 0.2)'
                }}>
                  <div style={{
                    fontSize: '12px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    marginBottom: '4px'
                  }}>
                    <Users size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    Total Voters
                  </div>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: '800',
                    color: '#22c55e'
                  }}>
                    {assembly.totalVoters.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div style={{
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.6)'
              }}>
                Avg {assembly.totalBooths > 0 ? Math.round(assembly.totalVoters / assembly.totalBooths).toLocaleString() : '—'} voters/booth
              </div>

              {assembly.totalBooths === 0 && (
                <div style={{
                  marginTop: '12px',
                  padding: '8px 12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  fontSize: '12px',
                  color: '#fca5a5',
                  fontWeight: '500'
                }}>
                  ⚠️ Missing booth data (PART_NO = null)
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '40px',
          padding: '20px',
          textAlign: 'center',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          fontSize: '14px',
          color: 'rgba(255, 255, 255, 0.6)'
        }}>
          <p style={{ margin: '0 0 8px 0' }}>
            Last Updated: {new Date(assemblyBoothData.lastUpdated).toLocaleString()}
          </p>
          <p style={{ margin: 0 }}>
            Data Source: Tamil Nadu Voter Database (DB1 - voter_db)
          </p>
        </div>
      </div>
    </div>
  );
};

export default AssemblyBoothsPage;
