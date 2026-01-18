import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import styles from '../CrocodileRules.module.css';

export default function CrocodileRules({ roomCode, settings: initialSettings }) {
    const [settings, setSettings] = useState(initialSettings);
    const [players, setPlayers] = useState(['']); // Начальное поле для 1 игрока
    const [isSaving, setIsSaving] = useState(false);
    const [isStarting, setIsStarting] = useState(false);

    useEffect(() => {
        // Слушаем события через WebSocket
        if (!window.Echo) {
            return;
        }

        const channel = window.Echo.channel(`room.${roomCode}`);

        channel
            .listen('.crocodile.settings.updated', (e) => {
                setSettings(e.settings);
            })
            .listen('.crocodile.game.started', () => {
                router.get(`/room/${roomCode}/crocodile/game`);
            });

        return () => {
            window.Echo.leave(`room.${roomCode}`);
        };
    }, [roomCode]);

    const handleAddPlayer = () => {
        setPlayers([...players, '']);
    };

    const handleRemovePlayer = (index) => {
        if (players.length > 1) {
            const newPlayers = players.filter((_, i) => i !== index);
            setPlayers(newPlayers);
        }
    };

    const handlePlayerChange = (index, value) => {
        const newPlayers = [...players];
        newPlayers[index] = value;
        setPlayers(newPlayers);
    };

    const handleStartGame = async () => {
        const validPlayers = players.filter(p => p.trim() !== '');
        
        if (validPlayers.length < 1) {
            alert('Нужно минимум 1 игрок для начала игры');
            return;
        }

        setIsStarting(true);
        try {
            if (window.axios) {
                await window.axios.post(`/room/${roomCode}/crocodile/start`, {
                    players: validPlayers,
                });
                router.get(`/room/${roomCode}/crocodile/game`);
            }
        } catch (err) {
            console.error('Ошибка при запуске игры:', err);
            alert(err.response?.data?.error || 'Ошибка при запуске игры');
            setIsStarting(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <div className={styles.header}>
                    <h1 className={styles.title}>🐊 Крокодил</h1>
                </div>

                <div className={styles.rulesSection}>
                    <h2 className={styles.sectionTitle}>Правила игры</h2>
                    
                    <div className={styles.rulesList}>
                        <div className={styles.ruleItem}>
                            <div className={styles.ruleNumber}>1</div>
                            <div className={styles.ruleText}>
                                Игроку выпадает <strong>слово</strong> и <strong>действие</strong> (рассказать или показать)
                            </div>
                        </div>

                        <div className={styles.ruleItem}>
                            <div className={styles.ruleNumber}>2</div>
                            <div className={styles.ruleText}>
                                Игрок должен <strong>рассказать</strong> или <strong>показать</strong> слово, не называя его
                            </div>
                        </div>

                        <div className={styles.ruleItem}>
                            <div className={styles.ruleNumber}>3</div>
                            <div className={styles.ruleText}>
                                Если игрок справляется с заданием, он получает <strong>балл</strong>
                            </div>
                        </div>

                        <div className={styles.ruleItem}>
                            <div className={styles.ruleNumber}>4</div>
                            <div className={styles.ruleText}>
                                Телефон передается следующему игроку по кругу
                            </div>
                        </div>

                        <div className={styles.ruleItem}>
                            <div className={styles.ruleNumber}>5</div>
                            <div className={styles.ruleText}>
                                Игра продолжается до тех пор, пока игроки не решат остановиться
                            </div>
                        </div>
                    </div>
                </div>

                {/* Настройки игры */}
                <div className={styles.settingsSection}>
                    <h3 className={styles.settingsTitle}>Настройки игры</h3>
                    <CrocodileSettings 
                        roomCode={roomCode} 
                        initialSettings={settings}
                        onSettingsChange={setSettings}
                    />
                </div>

                {/* Список игроков */}
                <div className={styles.playersSection}>
                    <h3 className={styles.playersTitle}>Игроки</h3>
                    <div className={styles.playersList}>
                        {players.map((player, index) => (
                            <div key={index} className={styles.playerInputWrapper}>
                                <input
                                    type="text"
                                    className={styles.playerInput}
                                    placeholder={`Игрок ${index + 1}`}
                                    value={player}
                                    onChange={(e) => handlePlayerChange(index, e.target.value)}
                                />
                                {players.length > 1 && (
                                    <button
                                        type="button"
                                        className={styles.removePlayerButton}
                                        onClick={() => handleRemovePlayer(index)}
                                        title="Удалить игрока"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    <button
                        type="button"
                        className={styles.addPlayerButton}
                        onClick={handleAddPlayer}
                    >
                        + Добавить игрока
                    </button>
                </div>

                <div className={styles.actions}>
                    <button 
                        onClick={handleStartGame}
                        className={styles.startButton}
                        disabled={isStarting || players.filter(p => p.trim() !== '').length < 1}
                    >
                        {isStarting ? 'Запуск игры...' : 'Начать игру'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Компонент настроек
function CrocodileSettings({ roomCode, initialSettings, onSettingsChange }) {
    const [timer, setTimer] = useState(initialSettings?.timer || 'unlimited');
    const [wordType, setWordType] = useState(initialSettings?.wordType || 'single');
    const [adultMode, setAdultMode] = useState(initialSettings?.adultMode || false);
    const [isSaving, setIsSaving] = useState(false);

    // Обновляем локальное состояние при изменении настроек
    useEffect(() => {
        if (initialSettings) {
            setTimer(initialSettings.timer || 'unlimited');
            setWordType(initialSettings.wordType || 'single');
            setAdultMode(initialSettings.adultMode || false);
        } else {
            setTimer('unlimited');
            setWordType('single');
            setAdultMode(false);
        }
    }, [initialSettings]);

    const handleSave = () => {
        setIsSaving(true);
        if (window.axios) {
            window.axios.post(`/room/${roomCode}/crocodile/settings`, {
                timer,
                wordType,
                adultMode,
            })
            .then((response) => {
                const newSettings = response.data.settings;
                setTimer(newSettings.timer);
                setWordType(newSettings.wordType);
                setAdultMode(newSettings.adultMode);
                if (onSettingsChange) {
                    onSettingsChange(newSettings);
                }
            })
            .catch(error => {
                console.error('Ошибка при сохранении настроек:', error);
                alert(error.response?.data?.error || 'Ошибка при сохранении настроек');
            })
            .finally(() => {
                setIsSaving(false);
            });
        }
    };

    const timerOptions = [
        { value: '60', label: '60 секунд', description: 'Средний темп' },
        { value: '30', label: '30 секунд', description: 'Быстрый темп' },
        { value: 'unlimited', label: 'Безлимит', description: 'Без ограничений' },
    ];

    const wordTypeOptions = [
        { value: 'single', label: '1 слово', description: 'Простые слова' },
        { value: 'phrase', label: 'Фраза', description: '2 слова вместе' },
        { value: 'all', label: 'Все подряд', description: 'Смешанный режим' },
    ];

    return (
        <div className={styles.settingsContent}>
            <div className={styles.settingGroup}>
                <label className={styles.settingLabel}>Таймер:</label>
                <div className={styles.buttonGroup}>
                    {timerOptions.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            className={`${styles.optionButton} ${timer === option.value ? styles.optionButtonActive : ''}`}
                            onClick={() => setTimer(option.value)}
                        >
                            <div className={styles.optionButtonMain}>{option.label}</div>
                            <div className={styles.optionButtonSub}>{option.description}</div>
                        </button>
                    ))}
                </div>
            </div>

            <div className={styles.settingGroup}>
                <label className={styles.settingLabel}>Тип слов:</label>
                <div className={styles.buttonGroup}>
                    {wordTypeOptions.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            className={`${styles.optionButton} ${wordType === option.value ? styles.optionButtonActive : ''}`}
                            onClick={() => setWordType(option.value)}
                        >
                            <div className={styles.optionButtonMain}>{option.label}</div>
                            <div className={styles.optionButtonSub}>{option.description}</div>
                        </button>
                    ))}
                </div>
            </div>

            <div className={styles.settingGroup}>
                <label className={styles.checkboxLabel}>
                    <input 
                        type="checkbox" 
                        checked={adultMode}
                        onChange={(e) => setAdultMode(e.target.checked)}
                    />
                    <span>Включить 18+ режим</span>
                </label>
            </div>

            <button 
                onClick={handleSave}
                className={styles.saveButton}
                disabled={isSaving}
            >
                {isSaving ? 'Сохранение...' : 'Сохранить настройки'}
            </button>
        </div>
    );
}
