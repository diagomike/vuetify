<template>
  <v-btn
    :icon="icon"
    height="28"
    rounded
    size="small"
    variant="text"
    @click="onClick"
  />
</template>

<script setup>
  // Stores
  import { useUserStore } from '@vuetify/one'

  // Utilities
  import { computed } from 'vue'

  const user = useUserStore()

  const icon = computed(() => {
    return user.railDrawer ? 'mdi-chevron-double-right' : 'mdi-chevron-double-left'
  })

  function onClick () {
    user.railDrawer = !user.railDrawer
  }
</script>
