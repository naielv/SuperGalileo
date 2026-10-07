<script>
	import LinkButton from '$lib/comp/buttons/LinkButton.svelte';
	import { m } from '$lib/paraglide/messages';
	import { page } from '$app/state';
</script>

<h1>Hola, {page.data.user?.name ?? page.data.user?.preferred_username}</h1>

<button onclick={async () => {
        window.location.href = '/auth/logout';
    }}>
    Cerrar sesión
</button>
