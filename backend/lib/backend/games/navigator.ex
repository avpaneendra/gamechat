defmodule Backend.Game.Navigator do
	use GenServer

	def start_link({room_id, game}) do
	
		IO.puts "initting game"
		# the last empty map is user_id: [x, y].
		GenServer.start_link(__MODULE__, {room_id, game, %{}}, name: {:via, Registry, {Backend.GameRegistry, {room_id, game}}})
	end

	def user_enter(pid, user_id) do
		%{
			type: "state",
			payload: GenServer.call(pid, {:user_enter, user_id})
		}
	end

	def user_exit(pid, user_id) do
		GenServer.cast(pid, {:user_exit, user_id})
	end

	def handle(pid, "move", json, %{room_id: room_id, user_id: user_id, game: game}) do
		
		%{"payload" => %{"direction" => direction}} = json

		incr = 10
		{key, increment} = case direction do
			"ArrowLeft" -> {:x, -incr}
			"ArrowRight" -> {:x, incr}
			"ArrowUp" -> {:y, incr}
			"ArrowDown" -> {:y, -incr}
			_ -> IO.puts "no match for direction"
		end

		%{
			type: "state",
			payload: GenServer.call(pid, {:move, user_id, key, increment})
		}
	end

	def handle(pid, "shape", json, %{room_id: room_id, user_id: user_id, game: game}) do

		%{"payload" => %{"shape" => shape }} = json

		%{
			type: "state",
			payload: GenServer.call(pid, {:shape, user_id, shape})
		}
	end

	def handle(pid, "spin", json, %{user_id: uid} = state) do
		%{"payload" => %{"spin" => direction}} = json

		increment = 0.1 # rotations per second.
		positions = case direction do
			"xup" -> GenServer.call(pid, {:spin, uid, :x, increment})
			"xdown" -> GenServer.call(pid, {:spin, uid, :x, -increment})
			"yup" -> GenServer.call(pid, {:spin, uid, :y, increment})
			"ydown" -> GenServer.call(pid, {:spin, uid, :y, -increment})
			"zup" -> GenServer.call(pid, {:spin, uid, :z, increment})
			"zdown" -> GenServer.call(pid, {:spin, uid, :z, -increment})
			"stop" -> GenServer.call(pid, {:spin, uid, :stop})
			other -> IO.puts other
		end

		%{
			type: "state",
			payload: positions
		}
	end

	def handle_call({:user_enter, user_id}, _from, {room_id, game, positions}) do

		positions = Map.put(positions, user_id, %{ position: %{x: 0, y: 0}, shape: "box", rotation: %{x: 0, y: 0, z: 0}, orientation: %{x: 0, y: 0, z: 0}})

		{:reply, positions, {room_id, game, positions}}
	end

	def handle_cast({:user_exit, user_id}, {room_id, game, positions} = state) do

		positions = Map.delete(positions, user_id)

		if (length(Map.keys(positions)) == 0) do
			{:stop, :empty_game, {room_id, game, positions}}
		else
			{:noreply, {room_id, game, positions}}
		end

	end

	def handle_call({:move, user_id, key, increment}, _from, {room_id, game, positions} = state) do

		{_, updated} = Kernel.get_and_update_in(positions, [user_id, :position, key], &{&1, &1 + increment })

		{:reply, positions, {room_id, game, updated}}

	end

	def handle_call({:shape, user_id, shape}, _from, {room_id, game, positions} = state) do

		{:reply, positions, {room_id, game, Kernel.put_in(positions, [user_id, :shape], shape)}}

	end

	def handle_call({:spin, user_id, direction, increment}, _from, {room_id, game, positions} = state) do

		{_, updated} = Kernel.get_and_update_in(positions, [user_id, :rotation, direction], &{&1, &1 + increment })

		{:reply, positions, {room_id, game, updated}}
	end

	def handle_call({:spin, user_id, :stop}, _from, {room_id, game, positions} = state) do

		loc = %{ positions[user_id] | rotation: %{x: 0, y: 0, z: 0 } } 

		{:reply, positions, {room_id, game, Map.put(positions, user_id, loc)}}

	end

	def handle(type, json, state) do
		IO.inspect type
		IO.inspect json 
		IO.inspect state
	end

end