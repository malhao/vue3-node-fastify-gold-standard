<script setup lang="ts">
import TaskForm from '../components/TaskForm.vue'
import TaskList from '../components/TaskList.vue'
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-semibold">Tasks</h1>
    <TaskForm />
    <TaskList />
  </div>
</template>
