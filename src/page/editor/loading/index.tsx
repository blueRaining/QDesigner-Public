import styles from "./index.module.less"

const Loading = () => {
    const text = '加载中...'
    // Split into individual characters for animation
    const chars = text.split('')

    return (
        <div className={styles.loadingWrapper}>
            <div className={styles.loadingContent}>
                <div className={styles.cubeContainer}>
                    <div className={styles.cube}>
                        <div className={styles.face + ' ' + styles.front}></div>
                        <div className={styles.face + ' ' + styles.back}></div>
                        <div className={styles.face + ' ' + styles.left}></div>
                        <div className={styles.face + ' ' + styles.right}></div>
                        <div className={styles.face + ' ' + styles.top}></div>
                        <div className={styles.face + ' ' + styles.bottom}></div>
                    </div>
                </div>
                <div className={styles.loadingText}>
                    {chars.map((char, i) => (
                        <span key={i}>{char}</span>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default Loading
