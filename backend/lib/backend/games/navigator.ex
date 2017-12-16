defmodule Backend.Game.Navigator do
	use GenServer

	# in this game, each player has a cube with a color.
	# they can move their cube around, and they send inputs.
	# here we figure out what the previous position was, and apply the update.
	# everything moves in normalized space [-1, 1]

	def handle("move", json, %{room_id: room_id, user_id: user_id, game: game}) do
		
		# look up this persons previous state on ets.
		# state is just position, velocity & timestamp


		# case Registry.lookup(Backend.Registry, "#{user_id}-#{room_id}-#{game}") do
		# end

		
	end
	

	def handle(type, json, state) do
		# this thing needs to be initted
	end

end