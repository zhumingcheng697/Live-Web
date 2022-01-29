document.addEventListener("DOMContentLoaded", () => {
    if (navigator.maxTouchPoints) {
        document.body.classList.add("mobile")
    }

    const video = document.querySelector("video");
    const time = document.getElementById("time");
    let isMouseDown = false;
    let shouldPlay = false;
    let dragTimeoutId;
    let promptTimeoutId;
    let pCord = {};

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
            return `${ Math.floor(s / 60 / 60) }:${ Math.floor(s % (60 * 60)) }:${ numToTwoDigit(s % 60) }`;
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

    setInterval(update, 5);

    function showPrompt() {
        clearTimeout(promptTimeoutId);
        document.body.classList.add("show-prompt");
        promptTimeoutId = setTimeout(() => {
            document.body.classList.remove("show-prompt");
        }, 1500)
    }

    function updateXY(e) {
        const y = e.clientY / window.innerHeight;
        let newVolume = 1 - y;

        if (newVolume > 1) {
            newVolume = 1;
        } else if (newVolume < 0) {
            newVolume = 0
        }
        video.volume = newVolume;
        document.documentElement.style.setProperty("--mouse-x", `${ e.clientX }px`);
        document.documentElement.style.setProperty("--mouse-y", `${ e.clientY }px`);
        document.documentElement.style.setProperty("--my-scale", `${ 1.5 - (y - 0.5) }`);
    }

    video.volume = 0.5;

    document.addEventListener("keydown", (e) => {
        let newTime = video.currentTime;

        switch (e.key) {
            case " ":
            case "Enter":
                if (video.paused) {
                    video.play();
                } else {
                    video.pause();
                }
                break;
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
        }

        if (newTime < 0) {
            newTime = 0;
        } else if (newTime > video.duration) {
            newTime = video.duration;
        }

        video.currentTime = newTime;

        update();
    });

    function handleMove(e) {
        if (!video.paused) {
            video.pause();
        }

        let newTime = video.currentTime;

        const diff = (pCord.clientX === undefined ? 0 : e.clientX - pCord.clientX) / window.innerWidth;
        const coefficient = Math.abs(diff) * diff * 500 + 1.5 * diff;
        newTime += video.duration * coefficient;

        if (newTime < 0) {
            newTime = 0;
        } else if (newTime > video.duration) {
            newTime = video.duration;
        }

        video.currentTime = newTime;

        showPrompt();

        update();

        pCord = e;
    }

    document.addEventListener("mousemove", (e) => {
        e.preventDefault();

        updateXY(e);

        if (isMouseDown) {
            handleMove(e);
        }
    });

    document.addEventListener("touchmove", (e) => {
        e.preventDefault();

        switch (e.touches.length) {
            case 1:
                updateXY(e.touches[0]);
                break;
            case 2:
                const newE = {};
                for (let key in e.touches[0]) {
                    if (typeof e.touches[0][key] !== "number") continue;
                    newE[key] = (e.touches[0][key] + e.touches[1][key]) / 2;
                }
                handleMove(newE);
        }
    });

    document.addEventListener("mousedown", (e) => {
        if (e.button > 1) return;

        e.preventDefault();

        updateXY(e);

        isMouseDown = true;
        shouldPlay = !video.paused;
        dragTimeoutId = setTimeout(() => {
            document.body.classList.add("pressed");
        }, 500);
    });

    function handleRelease(e) {
        e.preventDefault();

        if (!document.body.classList.contains("pressed")) {
            if (video.paused) {
                video.play();
            } else {
                video.pause();
            }
        } else {
            if (shouldPlay) {
                video.play();
            }
        }

        pCord = {};

        clearTimeout(dragTimeoutId);
        isMouseDown = false;
        document.body.classList.remove("pressed");
    }

    document.addEventListener("mouseup", (e) => {
        if (e.button > 1) return;
        updateXY(e);
        handleRelease(e)
    });

    document.addEventListener("touchend", handleRelease);

    document.addEventListener("mouseleave", (e) => {
        if (e.button > 1) return;

        clearTimeout(dragTimeoutId);
        isMouseDown = false;
        document.body.classList.remove("pressed");
    });
});
