<script>
	import Button from '$lib/comp/buttons/Button.svelte';
	import GridButton from '$lib/comp/buttons/GridButton.svelte';
	import { mdiCoffeeMaker, mdiPlus } from '@mdi/js';
	import { onMount } from 'svelte';

	onMount(() => {
		window.dispatchEvent(new CustomEvent('sidebar-closed'));
	});
</script>

<div class="co">
	<h1>¿Que quieres hacer?</h1>
	<div class="hero3 grid">
		<GridButton type="link" href="/coffee_shop/_new" icon={mdiPlus} label="Nueva comanda" background="green" />
		<GridButton type="link" href="/coffee_shop" icon={mdiCoffeeMaker} label="Preparar café" background="purple" />
		<GridButton type="link" href="/coffee_shop/_kitchen" icon={mdiCoffeeMaker} label="Modo cocina" background="darkgoldenrod" />
	</div>
</div>

<style>
	div.co {
		padding: 15px;
		background-color: wheat;
		height: 100%;
		display: flex;
		flex-direction: column;
		gap: 5px;
	}
</style>
