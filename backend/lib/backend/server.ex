defmodule Backend.Server do
	
	def start_link(_opts) do 

		IO.puts "start"

		{:ok, _ } = :cowboy.start_clear(
			:http,
			[{ :port, 8080 }],
			%{
				:env => %{ :dispatch => config() }
			}
		)
	end

	defp config do
		:cowboy_router.compile([
			{:_, [
				{"/", Backend.RootPageHandler, []},
				{"/ws", Backend.WebsocketHandler, []}
			]}
		])
	end

	def child_spec(_opts) do
		import Supervisor.Spec
		worker(__MODULE__, [12_000])
	end
end