<script>
	import { page } from '$app/state';
	import CoffeeOrderForm from '$lib/comp/coffee/CoffeeOrderForm.svelte';

	const id = page.params.id;
</script>

<CoffeeOrderForm {id} />
