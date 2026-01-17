/**
 * Компонент карточки игрока для игры Шпион
 */
export default function PlayerCard({ player, isReady = false, voteCount = 0, onClick, className = '' }) {
    return (
        <div 
            className={className}
            onClick={onClick}
            style={{ cursor: onClick ? 'pointer' : 'default' }}
        >
            <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '50%', 
                backgroundColor: '#4a90e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '18px'
            }}>
                {player.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ marginTop: '8px' }}>
                <div style={{ fontWeight: '500' }}>{player.name}</div>
                {isReady && (
                    <div style={{ color: '#4caf50', fontSize: '14px' }}>✓</div>
                )}
                {voteCount > 0 && (
                    <div style={{ fontSize: '12px', color: '#666' }}>
                        {voteCount} {voteCount === 1 ? 'голос' : 'голосов'}
                    </div>
                )}
            </div>
        </div>
    );
}
