<script>
	import LinkButton from '$lib/comp/buttons/LinkButton.svelte';
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
	<LinkButton href="/settings/database" icon={mdiDatabase} label={m.database()} />
	<LinkButton href="/settings/app" icon={mdiCog} label={m.app_settings()} />
</div>
