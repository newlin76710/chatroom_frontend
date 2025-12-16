import { useEffect, useRef, useState } from "react";

export default function SongPanel({ socket, room, name }) {
    const mediaRecorderRef = useRef(null);
    const audioChunks = useRef([]);
    const [recording, setRecording] = useState(false);
    const [playingSong, setPlayingSong] = useState(null);
    const [score, setScore] = useState(0);
    const audioRef = useRef(null);

    // 🎤 開始錄音
    const startRecord = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        audioChunks.current = [];

        recorder.ondataavailable = e => audioChunks.current.push(e.data);

        recorder.onstop = async () => {
            const blob = new Blob(audioChunks.current, { type: "audio/webm" });
            const arrayBuffer = await blob.arrayBuffer();
            const base64 = btoa(
                new Uint8Array(arrayBuffer)
                    .reduce((data, byte) => data + String.fromCharCode(byte), "")
            );

            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/song/upload`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    audioBase64: base64,
                    singer: name
                })
            });

            const data = await res.json();

            socket.emit("startSong", {
                room,
                singer: name,
                songUrl: `${import.meta.env.VITE_BACKEND_URL}${data.url}`
            });
        };


        recorder.start();
        setRecording(true);
    };

    // ⏹ 停止錄音
    const stopRecord = () => {
        mediaRecorderRef.current.stop();
        setRecording(false);
    };

    // 🔊 播放房間內的歌
    useEffect(() => {
        socket.on("playSong", ({ singer, songUrl }) => {
            setPlayingSong({ singer, songUrl });
        });

        socket.on("songResult", ({ singer, avg, count }) => {
            alert(`🎤 ${singer} 平均分數：${avg}（${count}人評分）`);
            setPlayingSong(null);
            setScore(0);
        });

        return () => {
            socket.off("playSong");
            socket.off("songResult");
        };
    }, [socket]);

    // ⭐ 送出評分
    const sendScore = () => {
        socket.emit("scoreSong", { room, score });
    };

    return (
        <div className="song-panel">
            <h4>🎤 唱歌區</h4>

            {!recording ? (
                <button onClick={startRecord}>開始唱歌</button>
            ) : (
                <button onClick={stopRecord}>結束錄音</button>
            )}

            {playingSong && (
                <div className="song-playing">
                    <p>🎶 正在播放：{playingSong.singer}</p>
                    <audio ref={audioRef} src={playingSong.songUrl} controls autoPlay />

                    <div className="score">
                        <select value={score} onChange={e => setScore(+e.target.value)}>
                            <option value="0">評分</option>
                            {[1, 2, 3, 4, 5].map(n => (
                                <option key={n} value={n}>{n} ⭐</option>
                            ))}
                        </select>
                        <button onClick={sendScore}>送出</button>
                    </div>
                </div>
            )}
        </div>
    );
}
