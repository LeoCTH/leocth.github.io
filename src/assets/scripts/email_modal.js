(() => {
	const button = document.getElementById("copy-email");

	function conclude(success) {
		button.classList.remove("is-loading");
		button.dataset.success = success;
		setTimeout(() => (button.dataset.success = ""), 1500);
	}
	button.onclick = () => {
		button.classList.add("is-loading");

		const email = document.getElementById("obscured-email");
		const sanitized = email.textContent.replace(/\d/g, "");

		navigator.clipboard.writeText(sanitized).then(
			() => conclude(true),
			() => conclude(false)
		);
	};
})();
