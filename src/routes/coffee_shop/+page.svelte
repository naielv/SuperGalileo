<script>
	import LinkButton from '$lib/comp/buttons/LinkButton.svelte';
	import { mdiCoffeeMaker, mdiPlus } from '@mdi/js';
	import { onMount } from 'svelte';

	onMount(() => {
		window.dispatchEvent(new CustomEvent('sidebar-open'));
	});
</script>

<div class="co">
	<h2>¡Te damos la bienvenida a SuperCafé!</h2>
	<h1>¿Que quieres hacer?</h1>
	<div class="co2">
		<LinkButton href="/coffee_shop/_new" label="Nueva comanda" icon={mdiPlus} background="green" />
		<LinkButton href="/coffee_shop" label="Preparar café" icon={mdiCoffeeMaker} />
		<LinkButton href="/coffee_shop/_kitchen" label="Modo cocina" icon={mdiCoffeeMaker} />
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
	div.co2 {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: center;
		align-content: flex-start;
		gap: 5px;
	}
</style>
