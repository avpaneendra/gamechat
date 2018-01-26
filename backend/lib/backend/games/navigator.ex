defmodule Backend.Game.Navigator do
	use GenServer

	# in this game, each player has a cube with a color.
	# they can move their cube around, and they send inputs.
	# here we figure out what the previous position was, and apply the update.
	# everything moves in normalized space [-1, 1]

	def start_link({room_id, game}) do
	
		IO.puts "initting game"
		# the last empty map is user_id: [x, y].
		GenServer.start_link(__MODULE__, {room_id, game, %{}}, name: {:via, Registry, {Backend.GameRegistry, {room_id, game}}})
	end

	def handle(pid, "move", json, %{room_id: room_id, user_id: user_id, game: game}) do
		
		# look up this persons previous state
		# state is just position, velocity & timestamp

		%{"payload" => %{"direction" => direction}} = json
		positions = GenServer.call(pid, {:move, user_id, direction})

		%{
			type: "state",
			payload: positions
		}

	end

	def handle_call({:move, user_id, direction}, _from, {room_id, game, positions} = state) do
		# IO.puts "move"

		%{x: x, y: y} = if (Map.has_key?(positions, user_id)), do: positions[user_id], else: %{x: 0, y: 0}

		case direction do
			"ArrowLeft" -> 
				# IO.puts "left"
				x = x - 10
			"ArrowRight" -> 
				# IO.puts "right"
				x = x + 10
			"ArrowUp" -> 
				# IO.puts "up"
				y = y + 10
			"ArrowDown" -> 
				# IO.puts "down"
				y = y - 10
			_ -> IO.puts "no match for direction"
		end

		positions = Map.put(positions, user_id, %{x: x, y: y})

		{:reply, positions, {room_id, game, positions}}

	end

	def handle(type, json, state) do
		IO.inspect type
		IO.inspect json 
		IO.inspect state
	end
	

	def handle(type, json, state) do
		# this thing needs to be initted
	end

end