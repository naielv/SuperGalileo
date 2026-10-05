<script>
	import LinkButton from '$lib/comp/buttons/LinkButton.svelte';
	import { m } from '$lib/paraglide/messages';
	import { pb } from '$lib/pb';
	
</script>

<h1>Hola, {pb.authStore.model.name}</h1>

<button onclick={async () => {
        await pb.authStore.clear();
        window.location.href = '/login';
    }}>
    Cerrar sesión
</button>