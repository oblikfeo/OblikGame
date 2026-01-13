import { useState } from 'react';
import { router } from '@inertiajs/react';
import styles from './Lobby.module.css';

export default function Lobby() {
    const [playerName, setPlayerName] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [showJoinForm, setShowJoinForm] = useState(false);

    const handleCreateRoom = (e) => {
        e.preventDefault();
        if (!playerName.trim()) {
            alert('Введите ваше имя');
            return;
        }
        router.post('/room/create', { playerName });
    };

    const handleJoinRoom = (e) => {
        e.preventDefault();
        if (!playerName.trim()) {
            alert('Введите ваше имя');
            return;
        }
        if (!roomCode.trim()) {
            alert('Введите код комнаты');
            return;
        }
        router.post('/room/join', { playerName, roomCode: roomCode.toUpperCase() });
    };

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <h1 className={styles.title}>oblik game</h1>
                
                <div className={styles.formSection}>
                    <input
                        type="text"
                        placeholder="Ваше имя"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        className={styles.input}
                        maxLength={20}
                    />
                </div>

                {!showJoinForm ? (
                    <div className={styles.buttons}>
                        <button 
                            onClick={handleCreateRoom}
                            className={`${styles.button} ${styles.buttonPrimary}`}
                        >
                            Создать комнату
                        </button>
                        <button 
                            onClick={() => setShowJoinForm(true)}
                            className={`${styles.button} ${styles.buttonSecondary}`}
                        >
                            Присоединиться
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleJoinRoom} className={styles.joinForm}>
                        <input
                            type="text"
                            placeholder="Код комнаты"
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                            className={styles.input}
                            maxLength={6}
                            style={{ textTransform: 'uppercase' }}
                        />
                        <div className={styles.buttons}>
                            <button 
                                type="submit"
                                className={`${styles.button} ${styles.buttonPrimary}`}
                            >
                                Войти
                            </button>
                            <button 
                                type="button"
                                onClick={() => {
                                    setShowJoinForm(false);
                                    setRoomCode('');
                                }}
                                className={`${styles.button} ${styles.buttonSecondary}`}
                            >
                                Назад
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
