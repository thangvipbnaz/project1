setInterval(() => {
    if (navigator.onLine) {
        console.log("Đang có mạng");
    } else {
        console.log("Mất mạng rồi");
    }
}, 3000);
