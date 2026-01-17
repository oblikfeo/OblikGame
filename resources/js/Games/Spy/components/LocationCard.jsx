import styles from '../Spy.module.css';

/**
 * Компонент карточки локации/роли для игры Шпион
 */
export default function LocationCard({ isSpy, location, showRole, onShowRole, blurred = true }) {
    return (
        <div 
            className={`${styles.gameInfo} ${blurred ? styles.blurred : ''}`}
            onClick={onShowRole}
            style={{ cursor: blurred ? 'pointer' : 'default' }}
        >
            {isSpy ? (
                <div className={styles.spyInfo}>
                    <div className={styles.infoIcon}>🕵️</div>
                    <div className={styles.infoText}>
                        {showRole ? (
                            <>
                                <strong>Вы - Шпион!</strong><br/>
                                Попытайтесь угадать локацию или не выдать себя
                            </>
                        ) : (
                            <>
                                <strong>Нажмите, чтобы увидеть роль</strong><br/>
                                <span style={{ fontSize: '14px', color: '#999' }}>Кликните для просмотра</span>
                            </>
                        )}
                    </div>
                </div>
            ) : (
                <div className={styles.locationInfo}>
                    <div className={styles.infoIcon}>📍</div>
                    <div className={styles.infoText}>
                        {showRole ? (
                            <>
                                <strong>Ваша локация:</strong><br/>
                                <span className={styles.locationName}>{location}</span>
                            </>
                        ) : (
                            <>
                                <strong>Нажмите, чтобы увидеть локацию</strong><br/>
                                <span style={{ fontSize: '14px', color: '#999' }}>Кликните для просмотра</span>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
