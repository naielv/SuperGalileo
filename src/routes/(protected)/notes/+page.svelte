<script>
	import { onMount } from "svelte";

    onMount(() => {
        window.dispatchEvent(new CustomEvent('sidebar-open'));
    })
</script>

<h1>Elige una nota usando el menú lateral</h1>