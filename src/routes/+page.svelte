<script>
	import LinkButton from '$lib/comp/buttons/LinkButton.svelte';
	import { m } from '$lib/paraglide/messages';
	import { mdiLogin, mdiAccountGroup, mdiSchool, mdiAccountSupervisorCircle, mdiCoffee, mdiWallet, mdiWarehouse, mdiNote, mdiStar, mdiQrcodeScan, mdiCog, mdiNotebook } from '@mdi/js';
</script>

<h1>¡Te damos la bienvenida a SuperGalileo!</h1>
<div class="hero3 grid">
	<LinkButton background="black" href="/cuenta" icon={mdiLogin} label={m.cuenta()} />
	<LinkButton href="/people" icon={mdiAccountGroup} label={m.people()} />
	<LinkButton background="black" href="/classroom_management" icon={mdiSchool} label={m.classroom_management()} />
	<LinkButton href="/coffee_shop" icon={mdiCoffee} label={m.coffee_shop()} />
	<LinkButton background="black" href="/wallets" icon={mdiAccountSupervisorCircle} label={m.wallets()} />
	<LinkButton background="black" href="/food_court" icon={mdiWallet} label={m.food_court()} />
	<LinkButton background="black" href="/warehouse" icon={mdiWarehouse} label={m.warehouse()} />
	<LinkButton href="/notes" icon={mdiNote} label={m.notes()} />
	<LinkButton background="black" href="/activities" icon={mdiStar} label={m.activities()} />
	<LinkButton background="black" href="/notebook" icon={mdiNotebook} label={m.notebook()} />
	<LinkButton background="black" href="/qr_scanner" icon={mdiQrcodeScan} label={m.qr_scanner()} />
	<LinkButton href="/settings" icon={mdiCog} label={m.settings()} />
</div>

<p class="accent">
	{m.did_you_know_accent_color_changes()}
</p>

<style>
	p.accent {
		max-width: 400px;
		font-size: 1.2em;
		text-align: justify;
		border-radius: 28px;
		padding: 10px 20px;
		display: inline-block;
	}
</style>