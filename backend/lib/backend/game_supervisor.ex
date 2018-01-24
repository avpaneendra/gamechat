defmodule Backend.GameSupervisor do
	use DynamicSupervisor

	def init(_arg) do
		DynamicSupervisor.init(strategy: :one_for_one)
	end

	def start_link(opts) do
		DynamicSupervisor.start_link(__MODULE__, opts, name: __MODULE__)
	end

end