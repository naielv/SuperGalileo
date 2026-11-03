<script>
	import Button from '$lib/comp/buttons/Button.svelte';
	import GridButton from '$lib/comp/buttons/GridButton.svelte';
	import { m } from '$lib/paraglide/messages';
	import { mdiLogin, mdiAccountGroup, mdiSchool, mdiAccountSupervisorCircle, mdiCoffee, mdiWallet, mdiWarehouse, mdiNote, mdiStar, mdiQrcodeScan, mdiCog, mdiNotebook } from '@mdi/js';
</script>

<div class="hero3 grid">
	<GridButton type="link" href="/people" icon={mdiAccountGroup} label={m.people()} />
	<GridButton type="link" href="/coffee_shop" icon={mdiCoffee} label={m.coffee_shop()} />
	<GridButton type="link" href="/notes" icon={mdiNote} label={m.notes()} />
	<GridButton type="link" href="/settings" icon={mdiCog} label={m.settings()} />
</div>
<hr>
<div class="hero3 grid">
	<GridButton type="link" background="black" href="/cuenta" icon={mdiLogin} label={m.cuenta()} />
	<GridButton type="link" background="black" href="/classroom_management" icon={mdiSchool} label={m.classroom_management()} />
	<GridButton type="link" background="black" href="/wallets" icon={mdiAccountSupervisorCircle} label={m.wallets()} />
	<GridButton type="link" background="black" href="/food_court" icon={mdiWallet} label={m.food_court()} />
	<GridButton type="link" background="black" href="/warehouse" icon={mdiWarehouse} label={m.warehouse()} />
	<GridButton type="link" background="black" href="/activities" icon={mdiStar} label={m.activities()} />
	<GridButton type="link" background="black" href="/notebook" icon={mdiNotebook} label={m.notebook()} />
	<GridButton type="link" background="black" href="/qr_scanner" icon={mdiQrcodeScan} label={m.qr_scanner()} />
</div>
