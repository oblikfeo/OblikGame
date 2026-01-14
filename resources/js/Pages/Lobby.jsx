import { useState, useMemo } from 'react';
import { router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
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
        // Проверяем, что код состоит из 3 цифр
        if (!/^\d{3}$/.test(roomCode.trim())) {
            alert('Код комнаты должен состоять из 3 цифр');
            return;
        }
        router.post('/room/join', { playerName, roomCode: roomCode.trim() });
    };

    // Анимации для контейнера формы
    const containerVariants = {
        hidden: { opacity: 0, scale: 0.8, y: 20 },
        visible: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: {
                duration: 0.3,
                ease: "easeOut",
                staggerChildren: 0.05
            }
        }
    };

    // Анимации для элементов формы
    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.2 }
        }
    };

    // Анимации для переключения между формами
    const formVariants = {
        initial: { opacity: 0, x: -20 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 20 }
    };

    // Генерируем данные для частиц один раз
    const particlesData = useMemo(() => {
        return Array.from({ length: 10 }, (_, i) => ({
            id: i,
            left: 5 + i * 9.5,
            top: 20 + Math.random() * 60,
            duration: 1.5 + Math.random() * 1,
            delay: Math.random() * 1,
            xOffset: Math.random() * 20 - 10
        }));
    }, []);

    return (
        <div className={styles.container}>
            {/* Анимированный фон */}
            <motion.div 
                className={styles.animatedBackground}
                animate={{
                    backgroundPosition: ['0% 0%', '100% 100%'],
                }}
                transition={{
                    duration: 10,
                    repeat: Infinity,
                    repeatType: 'reverse',
                    ease: 'linear'
                }}
            />
            
            {/* Частицы/пузыри на фоне */}
            <div className={styles.particles}>
                {particlesData.map((particle) => (
                    <motion.div
                        key={particle.id}
                        className={styles.particle}
                        animate={{
                            y: [0, -30, 0],
                            x: [0, particle.xOffset, 0],
                            opacity: [0.5, 0.8, 0.5],
                            scale: [1, 1.2, 1],
                        }}
                        transition={{
                            duration: particle.duration,
                            repeat: Infinity,
                            delay: particle.delay,
                            ease: "easeInOut"
                        }}
                        style={{
                            left: `${particle.left}%`,
                            top: `${particle.top}%`,
                        }}
                    />
                ))}
            </div>

            <motion.div 
                className={styles.content}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <motion.div 
                    className={styles.formSection}
                    variants={itemVariants}
                >
                    <motion.input
                        type="text"
                        placeholder="Ваше имя"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        className={styles.input}
                        maxLength={20}
                        whileFocus={{ 
                            scale: 1.02
                        }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    />
                </motion.div>

                <AnimatePresence mode="wait">
                    {!showJoinForm ? (
                        <motion.div 
                            key="main-buttons"
                            className={styles.buttons}
                            variants={itemVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                        >
                            <motion.button 
                                onClick={handleCreateRoom}
                                className={`${styles.button} ${styles.buttonPrimary}`}
                                whileHover={{ 
                                    scale: 1.05,
                                    y: -3,
                                    boxShadow: "0 12px 24px rgba(102, 126, 234, 0.4)"
                                }}
                                whileTap={{ scale: 0.98 }}
                                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                            >
                                Создать комнату
                            </motion.button>
                            <motion.button 
                                onClick={() => setShowJoinForm(true)}
                                className={`${styles.button} ${styles.buttonSecondary}`}
                                whileHover={{ 
                                    scale: 1.05,
                                    y: -3
                                }}
                                whileTap={{ scale: 0.98 }}
                                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                            >
                                Присоединиться
                            </motion.button>
                        </motion.div>
                    ) : (
                        <motion.form 
                            key="join-form"
                            onSubmit={handleJoinRoom} 
                            className={styles.joinForm}
                            variants={formVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            transition={{ duration: 0.2 }}
                        >
                            <motion.input
                                type="text"
                                placeholder="Код комнаты (3 цифры)"
                                value={roomCode}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '').slice(0, 3);
                                    setRoomCode(value);
                                }}
                                className={styles.input}
                                maxLength={3}
                                inputMode="numeric"
                                pattern="[0-9]{3}"
                                whileFocus={{ 
                                    scale: 1.02
                                }}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ 
                                    type: "spring", 
                                    stiffness: 400, 
                                    damping: 17,
                                    delay: 0.1 
                                }}
                            />
                            <motion.div 
                                className={styles.buttons}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <motion.button 
                                    type="submit"
                                    className={`${styles.button} ${styles.buttonPrimary}`}
                                    whileHover={{ 
                                        scale: 1.05,
                                        y: -3,
                                        boxShadow: "0 12px 24px rgba(102, 126, 234, 0.4)"
                                    }}
                                    whileTap={{ scale: 0.98 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                >
                                    Войти
                                </motion.button>
                                <motion.button 
                                    type="button"
                                    onClick={() => {
                                        setShowJoinForm(false);
                                        setRoomCode('');
                                    }}
                                    className={`${styles.button} ${styles.buttonSecondary}`}
                                    whileHover={{ 
                                        scale: 1.05,
                                        y: -3
                                    }}
                                    whileTap={{ scale: 0.98 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                >
                                    Назад
                                </motion.button>
                            </motion.div>
                        </motion.form>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
