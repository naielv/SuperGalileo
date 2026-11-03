<script>
	import Button from '$lib/comp/buttons/Button.svelte';
	import PersonSelector from '$lib/comp/PersonSelector.svelte';
	import { m } from '$lib/paraglide/messages';
	import {
		mdiLogin,
		mdiAccountGroup,
		mdiSchool,
		mdiAccountSupervisorCircle,
		mdiCoffee,
		mdiWallet,
		mdiWarehouse,
		mdiNote,
		mdiStar,
		mdiQrcodeScan,
		mdiCog,
		mdiDatabase
	} from '@mdi/js';
</script>

<h1>{m.settings()}</h1>

<div class="hero3 grid">
	<Button type="link" href="/settings/database" icon={mdiDatabase} label={m.database()} />
	<Button type="link" href="/settings/app" icon={mdiCog} label={m.app_settings()} />
</div>
