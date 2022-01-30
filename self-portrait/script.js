document.addEventListener("DOMContentLoaded", () => {
    const video = document.querySelector("video");
    const time = document.getElementById("time");

    let isMouseDown = false;
    let shouldPlay = false;
    let dragTimeoutId;
    let promptTimeoutId;
    let downInVideo = false;
    let autoPlayed = false;

    function numToTwoDigit(n) {
        const floored = Math.floor(n);
        if (floored < 10) {
            return `0${ floored }`;
        }
        return `${ floored }`;
    }

    function formatSecond(s) {
        if (s < 1) {
            return "0:00";
        } else if (s < 60) {
            return `0:${ numToTwoDigit(s) }`;
        } else if (s < 60 * 60) {
            return `${ Math.floor(s / 60) }:${ numToTwoDigit(s % 60) }`;
        } else {
            return `${ Math.floor(s / 60 / 60) }:${ numToTwoDigit(s % (60 * 60)) }:${ numToTwoDigit(s % 60) }`;
        }
    }

    function updateOpacity() {
        const currentTime = video.currentTime || 0;

        if (currentTime >= 1.8) {
            document.documentElement.style.setProperty("--my-opacity", "0");
            return;
        }

        if (currentTime <= 0.4) {
            document.documentElement.style.setProperty("--my-opacity", "1");
            return;
        }

        if (currentTime <= 0.8175) {
            document.documentElement.style.setProperty("--my-opacity", `${ -currentTime / 2 + 1.2 }`);
            return;
        }

        if (currentTime <= 1.4) {
            document.documentElement.style.setProperty("--my-opacity", `${ (currentTime - 2) * (currentTime - 2) * 0.48 + 0.12 }`);
            return;
        }

        document.documentElement.style.setProperty("--my-opacity", `${ (currentTime - 2.3) * (currentTime - 2.3) * 0.55 - 0.15 }`);
    }

    function updatePrompt() {
        const currentTime = video.currentTime || 0;
        const fullTime = video.duration || 0;
        time.innerHTML = `${ formatSecond(currentTime) } / ${ formatSecond(fullTime) }`;

        document.documentElement.style.setProperty("--my-duration", `${ ((currentTime / fullTime) || 0) * 100 }%`);
    }

    function update() {
        updateOpacity();
        updatePrompt();
    }

    function showPrompt() {
        clearTimeout(promptTimeoutId);
        document.body.classList.add("show-prompt");
        promptTimeoutId = setTimeout(() => {
            document.body.classList.remove("show-prompt");
        }, 1500);
    }

    // handles the movement of mouse and touches
    function updateXY(e) {
        const y = e.clientY / window.innerHeight;
        let newVolume = 1 - y;

        if (newVolume > 1) {
            newVolume = 1;
        } else if (newVolume < 0) {
            newVolume = 0;
        }
        video.volume = newVolume;
        document.documentElement.style.setProperty("--mouse-x", `${ e.clientX }px`);
        document.documentElement.style.setProperty("--mouse-y", `${ e.clientY }px`);
        document.documentElement.style.setProperty("--my-scale", `${ 1.5 - (y - 0.5) }`);
    }

    function setVideoTime(newTime) {
        // makes sure not to go below 0 or more than video length
        if (newTime < 0) {
            newTime = 0;
        } else if (newTime > video.duration) {
            newTime = video.duration;
        }

        video.currentTime = newTime;
    }

    // hack for video color showing up differently on iOS
    if (navigator.userAgent.match(/\b(?:iphone|ipad|ipod|macintosh)/i) && navigator.maxTouchPoints) {
        document.body.classList.add("mobile");
    }

    video.volume = 0.5;

    setInterval(update, 5);

    document.addEventListener("keydown", (e) => {
        let newTime = video.currentTime;

        switch (e.key) {
            case " ":
            case "Enter":
                if (video.paused) {
                    video.play();
                    autoPlayed = true;
                } else {
                    video.pause();
                }
                update();
                return;
            case "ArrowLeft":
                e.preventDefault();
                newTime -= 2;
                showPrompt();
                break;
            case "ArrowRight":
                e.preventDefault();
                newTime += 2;
                showPrompt();
                break;
            default:
                if (e.key.length === 1){
                    const numKey = parseInt(e.key);

                    if (!isNaN(numKey)) {
                        newTime = video.duration / 10 * numKey;
                        showPrompt();
                        break;
                    }
                }

                update();
                return;
        }

        setVideoTime(newTime);

        update();
    });

    document.addEventListener("mousemove", (e) => {
        e.preventDefault();

        // rewind or fast-forward if the mouse is pressed down
        if (isMouseDown) {
            // pauses the video to improve performance
            if (!video.paused) {
                video.pause();
            }

            let newTime = video.currentTime;
            const diff = e.movementX / window.innerWidth;
            const coefficient = Math.abs(diff) * diff * 500 + 1.5 * diff;
            newTime += video.duration * coefficient;

            setVideoTime(newTime)
            showPrompt();
            update();
        }

        // only update the coordinate on desktop, special treatment for touches
        if (window.matchMedia("(hover: hover) and (pointer: fine)").matches && !navigator.maxTouchPoints) {
            updateXY(e);
        }
    });

    document.addEventListener("touchmove", (e) => {
        e.preventDefault();

        // only care about single-finger gestures
        if (e.touches.length !== 1) return;

        updateXY(e.touches[0]);
    });

    document.addEventListener("mousedown", (e) => {
        if (e.button > 1) return;

        e.preventDefault();

        // if touches down outside video on mobile, do not pause/resume
        downInVideo = e.target === video;

        isMouseDown = true;

        // caches the video playback status
        shouldPlay = !video.paused;

        clearTimeout(dragTimeoutId);
        dragTimeoutId = setTimeout(() => {
            document.body.classList.add("pressed");
        }, 500);
        updateXY(e);
    });

    document.addEventListener("mouseup", (e) => {
        if (e.button > 1) return; // only care about left click (no middle click, right click, etc.)

        if (!autoPlayed) {
            // if it is the first click, play the video
            video.play();
            autoPlayed = true;
        } else if (!document.body.classList.contains("pressed") && downInVideo) {
            // if click on the video and not rewinding/fast-forwarding, pause/resume
            if (video.paused) {
                video.play();
            } else {
                video.pause();
            }
        } else if (document.body.classList.contains("pressed")) {
            // when rewind/fast-forward ended, resume if needed
            if (shouldPlay) {
                video.play();
            }
        }

        shouldPlay = false;
        isMouseDown = false;
        downInVideo = false;
        clearTimeout(dragTimeoutId);
        document.body.classList.remove("pressed");
    });

    // in case the user drags the mouse outside the viewport
    document.addEventListener("mouseleave", (e) => {
        if (e.button > 1) return; // only care about left click (no middle click, right click, etc.)

        clearTimeout(dragTimeoutId);
        isMouseDown = false;
        document.body.classList.remove("pressed");
    });
});
