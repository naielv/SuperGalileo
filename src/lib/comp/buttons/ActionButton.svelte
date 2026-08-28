<script>
  import SvgIcon from "@jamescoyle/svelte-icon";
  import { mdiLink } from "@mdi/js";
  let { onclick, label, icon = mdiLink, background = "var(--accent)", disabled = false } = $props();
</script>

<button class="btn" type="button" onclick={onclick} style={`background: ${background};`} disabled={disabled}>
  <SvgIcon type="mdi" path={icon} />
  <span>{label}</span>
</button>